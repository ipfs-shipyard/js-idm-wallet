import signal from 'pico-signals';
import { omit, pick, isEqual } from 'lodash';
import { composePrivateKey, composePublicKey, decomposePrivateKey, decomposePublicKey } from 'crypto-key-composer';
import { sha256 } from '../../utils/sha';
import { loadStore, dropStore } from './utils/orbitdb';
import { assertDeviceInfo } from './utils/asserts';
import { UnknownDeviceError, InvalidDeviceOperationError } from '../../utils/errors';
import { getCurrentDeviceKey } from './utils/storage-keys';
import { ORBITDB_STORE_NAME, ORBITDB_STORE_TYPE, DID_PUBLIC_KEY_PREFIX } from './utils/constants/devices';

class Devices {
    #currentDeviceDescriptor;
    #identityDescriptor;
    #didm;
    #orbitdbStore;

    #devicesMap;
    #devicesList;
    #onChange = signal();
    #onCurrentRevoke = signal();

    constructor(currentDeviceDescriptor, identityDescriptor, didm, orbitdbStore) {
        this.#currentDeviceDescriptor = currentDeviceDescriptor;
        this.#identityDescriptor = identityDescriptor;
        this.#didm = didm;
        this.#orbitdbStore = orbitdbStore;

        this.#orbitdbStore.events.on('write', this.#handleOrbitdbStoreChange);
        this.#orbitdbStore.events.on('replicated', this.#handleOrbitdbStoreChange);

        this.#updateDevices();
    }

    list() {
        return this.#devicesList;
    }

    getCurrent() {
        return this.get(this.#currentDeviceDescriptor.id);
    }

    get(id) {
        const device = this.#devicesMap[id];

        if (!device) {
            throw new UnknownDeviceError(id);
        }

        return device;
    }

    async revoke(id, params) {
        const device = this.#devicesMap[id];

        if (!device) {
            throw new UnknownDeviceError(id);
        }

        if (id === this.#currentDeviceDescriptor.id) {
            throw new InvalidDeviceOperationError('Revoking own device is not allowed');
        }

        if (!device.revokedAt) {
            // Remove device from DID Document and only then remove it from orbitdb
            await this.#didm.update(this.#identityDescriptor.did, params, (document) => {
                document.revokePublicKey(`${DID_PUBLIC_KEY_PREFIX}${id}`);
            });

            await this.#orbitdbStore.put(id, {
                ...device,
                revokedAt: Date.now(),
            });
        }
    }

    async updateInfo(id, deviceInfo) {
        assertDeviceInfo(deviceInfo);

        const device = this.#devicesMap[id];

        if (!device) {
            throw new UnknownDeviceError(id);
        }

        const storedDeviceInfo = pick(device, Object.keys(deviceInfo));

        if (!isEqual(deviceInfo, storedDeviceInfo)) {
            await this.#orbitdbStore.put(id, {
                ...device,
                updatedAt: Date.now(),
                ...deviceInfo,
            });
        }
    }

    onChange(fn) {
        return this.#onChange.add(fn);
    }

    onCurrentRevoke(fn) {
        return this.#onCurrentRevoke.add(fn);
    }

    #updateDevices = () => {
        this.#devicesMap = { ...this.#orbitdbStore.all };

        const currentId = this.#currentDeviceDescriptor.id;

        if (this.#devicesMap[currentId]) {
            this.#devicesMap[currentId] = {
                ...this.#devicesMap[currentId],
                privateKey: this.#currentDeviceDescriptor.privateKey,
            };
        }

        this.#devicesList = Object.values(this.#devicesMap);
        this.#devicesList.sort((device1, device2) => device2.createdAt - device1.createdAt);

        this.#onChange.dispatch(this.#devicesList);
    }

    #handleOrbitdbStoreChange = () => {
        const isCurrentDeviceRevoked = this.#isCurrentDeviceRevoked();

        this.#updateDevices();

        if (!isCurrentDeviceRevoked && this.#isCurrentDeviceRevoked()) {
            this.#onCurrentRevoke.dispatch();
        }
    }

    #isCurrentDeviceRevoked = () => {
        const { id } = this.#currentDeviceDescriptor;

        return !this.#devicesMap[id] || !!this.#devicesMap[id].revokedAt;
    }
}

export const generateCurrentDevice = async (deviceInfo) => {
    const cryptoKeyPair = await crypto.subtle.generateKey(
        {
            name: 'RSASSA-PKCS1-v1_5',
            modulusLength: 2048,
            publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
            hash: { name: 'SHA-256' },
        },
        true,
        ['sign', 'verify']
    );

    const [exportedPrivateKey, exportedPublicKey] = await Promise.all([
        crypto.subtle.exportKey('pkcs8', cryptoKeyPair.privateKey),
        crypto.subtle.exportKey('spki', cryptoKeyPair.publicKey),
    ]);

    const privateKey = composePrivateKey({ ...decomposePrivateKey(exportedPrivateKey, { format: 'pkcs8-der' }), format: 'pkcs8-pem' });
    const publicKey = composePublicKey({ ...decomposePublicKey(exportedPublicKey, { format: 'spki-der' }), format: 'spki-pem' });
    const id = await sha256(publicKey);

    const currentDevice = {
        id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        revokedAt: null,
        keyType: 'RsaVerificationKey2018',
        privateKey,
        publicKey,
        ...deviceInfo,
    };

    const didPublicKey = {
        id: `${DID_PUBLIC_KEY_PREFIX}${id}`,
        type: 'RsaVerificationKey2018',
        publicKeyPem: publicKey,
    };

    return {
        currentDevice,
        didPublicKey,
    };
};

export const createDevices = async (currentDevice, identityDescriptor, didm, storage, orbitdb) => {
    const currentDeviceWithoutPrivateKey = omit(currentDevice, 'privateKey');
    const currentDeviceDescriptor = pick(currentDevice, 'id', 'privateKey');
    const orbitdbStore = await loadStore(orbitdb, ORBITDB_STORE_NAME, ORBITDB_STORE_TYPE);

    await storage.set(getCurrentDeviceKey(identityDescriptor.id), currentDeviceDescriptor, { encrypt: true });
    await orbitdbStore.put(currentDeviceDescriptor.id, currentDeviceWithoutPrivateKey);

    return new Devices(currentDevice, identityDescriptor, didm, orbitdbStore);
};

export const restoreDevices = async (identityDescriptor, didm, storage, orbitdb) => {
    const currentDeviceDescriptor = await storage.get(getCurrentDeviceKey(identityDescriptor.id));
    const orbitdbStore = await loadStore(orbitdb, ORBITDB_STORE_NAME, ORBITDB_STORE_TYPE);

    return new Devices(currentDeviceDescriptor, identityDescriptor, didm, orbitdbStore);
};

export const removeDevices = async (identityDescriptor, storage, orbitdb) => {
    await storage.remove(getCurrentDeviceKey(identityDescriptor.id));
    await dropStore(orbitdb, ORBITDB_STORE_NAME, ORBITDB_STORE_TYPE);
};
