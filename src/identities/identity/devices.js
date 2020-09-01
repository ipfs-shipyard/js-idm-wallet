import signal from 'pico-signals';
import { omit, pick, merge, isEqual } from 'lodash';
import { loadStore, dropStore } from './utils/orbitdb';
import { assertDeviceInfo } from './utils/asserts';
import { UnknownDeviceError, InvalidDeviceOperationError } from '../../utils/errors';
import { generateDeviceKeyMaterial, hashSha256 } from '../../utils/crypto';
import { getCurrentDeviceKey } from './utils/storage-keys';
import { ORBITDB_STORE_NAME, ORBITDB_STORE_TYPE, DID_PUBLIC_KEY_PREFIX, DESCRIPTOR_SENSITIVE_KEYS } from './utils/constants/devices';

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

    has(id) {
        return Boolean(this.#devicesMap[id]);
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
                document.revokePublicKey(device.didPublicKeyId);
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
        const currentId = this.#currentDeviceDescriptor.id;

        this.#devicesMap = { ...this.#orbitdbStore.all };

        if (this.#devicesMap[currentId]) {
            this.#devicesMap[currentId] = merge(
                { ...this.#devicesMap[currentId], current: true },
                pick(this.#currentDeviceDescriptor, DESCRIPTOR_SENSITIVE_KEYS),
            );
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
    const keyMaterial = await generateDeviceKeyMaterial();
    const id = await hashSha256(keyMaterial.publicKeyPem, true);

    const currentDevice = {
        id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        revokedAt: null,
        didPublicKeyId: `${DID_PUBLIC_KEY_PREFIX}${id}`,
        keyMaterial,
        ...deviceInfo,
    };

    const didPublicKey = {
        id: currentDevice.didPublicKeyId,
        type: 'EdDsaSAPublicKeySecp256k1',
        publicKeyPem: keyMaterial.publicKeyPem,
        publicExtendedKeyBase58: keyMaterial.publicExtendedKeyBase58,
    };

    return {
        currentDevice,
        didPublicKey,
    };
};

export const createDevices = async (currentDevice, identityDescriptor, didm, storage, orbitdb) => {
    const currentDeviceWithoutSensitiveKeys = omit(currentDevice, DESCRIPTOR_SENSITIVE_KEYS);
    const currentDeviceDescriptor = pick(currentDevice, ['id', ...DESCRIPTOR_SENSITIVE_KEYS]);
    const orbitdbStore = await loadStore(orbitdb, ORBITDB_STORE_NAME, ORBITDB_STORE_TYPE);

    await storage.set(getCurrentDeviceKey(identityDescriptor.id), currentDeviceDescriptor, { encrypt: true });
    await orbitdbStore.put(currentDeviceDescriptor.id, currentDeviceWithoutSensitiveKeys);

    return new Devices(currentDeviceDescriptor, identityDescriptor, didm, orbitdbStore);
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
