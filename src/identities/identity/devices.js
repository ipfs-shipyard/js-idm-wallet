import signal from 'pico-signals';
import { reduce, omit, pick } from 'lodash';
import { InvalidDevicePropertyError, UnknownDeviceError, InvalidDeviceOperationError } from '../../utils/errors';
import { getCurrentDeviceKey } from './utils/storage-keys';
import openOrbitdbStore from './utils/orbitdb-stores';

const DEVICE_TYPES = ['phone', 'tablet', 'laptop', 'desktop'];

export const DEVICE_ID_PREFIX = 'idm-device-';

class Devices {
    #currentDevice;
    #identityDescriptor;
    #didm;
    #orbitdbStore;
    #onChange = signal();

    constructor(currentDevice, identityDescriptor, didm, orbitdbStore) {
        this.#currentDevice = currentDevice;
        this.#identityDescriptor = identityDescriptor;
        this.#didm = didm;
        this.#orbitdbStore = orbitdbStore;

        this.#orbitdbStore.events.on('write', this.#handleStoreChange);
        this.#orbitdbStore.events.on('replicated', this.#handleStoreChange);
    }

    list() {
        const obj = this.#orbitdbStore.all;
        const list = reduce(obj, (list, value, key) => {
            if (key === this.#currentDevice.id) {
                list.push(this.#buildCurrentDevice(value));
            } else {
                list.push(value);
            }

            return list;
        }, []);

        // Sort by most recently added
        list.sort((device1, device2) => device2.createdAt - device1.createdAt);

        return list;
    }

    getCurrent() {
        return this.get(this.#currentDevice.id);
    }

    get(id) {
        const device = this.#orbitdbStore.get(id);

        if (!device) {
            throw new UnknownDeviceError(id);
        }

        if (this.#currentDevice.id === id) {
            return this.#buildCurrentDevice(device);
        }

        return device;
    }

    async revoke(id, params) {
        if (id === this.#currentDevice.id) {
            throw new InvalidDeviceOperationError('Revoking own device is not allowed, please use identities.remove() instead');
        }

        // Remove device from DID Document and only then remove it from orbitdb
        await this.#didm.update(this.#identityDescriptor.did, params, (document) => {
            document.revokePublicKey(id);
        });

        await this.#orbitdbStore.del(id);
    }

    async update(id, deviceInfo) {
        const device = this.#orbitdbStore.get(id);

        if (!device) {
            throw new UnknownDeviceError(id);
        }

        const updatedDevice = {
            ...device,
            ...pick(deviceInfo, 'type', 'name'),
            updatedAt: Date.now(),
        };

        assertDevice(updatedDevice);

        await this.#orbitdbStore.put(id, updatedDevice);
    }

    onChange(fn) {
        return this.#onChange.add(fn);
    }

    #buildCurrentDevice = (device) => ({ ...device, ...this.#currentDevice })

    #handleStoreChange = () => {
        this.#onChange.dispatch(this.list());
    }
}

const loadOrbitdbStore = async (orbitdb, identityId) => {
    const store = await openOrbitdbStore(orbitdb, identityId, 'devices', 'keyvalue');

    await store.load();

    return store;
};

const assertDevice = (device, current = false) => {
    const { id, type, name, publicKey, privateKey } = device;

    if (!id || typeof id !== 'string' || !id.includes(DEVICE_ID_PREFIX)) {
        throw new InvalidDevicePropertyError('id', id);
    }

    if (!DEVICE_TYPES.includes(type)) {
        throw new InvalidDevicePropertyError('type', type);
    }

    if (!name || typeof name !== 'string') {
        throw new InvalidDevicePropertyError('name', name);
    }

    if (!publicKey) {
        throw new InvalidDevicePropertyError('publicKey', publicKey);
    }

    if (current && !privateKey) {
        throw new InvalidDevicePropertyError('privateKey', privateKey);
    }
};

export const assertCurrentDevice = (currentDevice) => assertDevice(currentDevice, true);

export const createDevices = async (currentDevice, identityDescriptor, didm, storage, orbitdb) => {
    assertCurrentDevice(currentDevice);

    const currentDeviceWithoutPrivateKey = omit(currentDevice, 'privateKey');
    const currentDeviceDescriptor = pick(currentDevice, 'id', 'publicKey', 'privateKey');

    const orbitdbStore = await loadOrbitdbStore(orbitdb, identityDescriptor.id);

    await orbitdbStore.put(currentDevice.id, currentDeviceWithoutPrivateKey);
    await storage.set(getCurrentDeviceKey(identityDescriptor.id), currentDeviceDescriptor, { encrypt: true });

    return new Devices(currentDevice, identityDescriptor, didm, orbitdbStore);
};

export const restoreDevices = async (identityDescriptor, didm, storage, orbitdb) => {
    const currentDevice = await storage.get(getCurrentDeviceKey(identityDescriptor.id));
    const orbitdbStore = await loadOrbitdbStore(orbitdb, identityDescriptor.id);

    return new Devices(currentDevice, identityDescriptor, didm, orbitdbStore);
};

export const removeDevices = async (identityDescriptor, didm, storage, orbitdb) => {
    const orbitdbStore = await loadOrbitdbStore(orbitdb, identityDescriptor.id);

    await orbitdbStore.drop();
    await storage.remove(getCurrentDeviceKey(identityDescriptor.id));
};
