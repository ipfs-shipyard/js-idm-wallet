import { InvalidDevicePropertyError } from '../../utils/errors';

const CURRENT_DEVICE_KEY_PREFIX = 'currentDevice!';

const DEVICE_TYPES = ['phone', 'tablet', 'laptop', 'desktop'];

export const DEVICE_ID_PREFIX = 'idm-device-';

class Devices {
    #current;

    constructor(current) {
        this.#current = current;
    }

    getCurrent() {
        return this.#current;
    }

    list() {
        return [this.getCurrent()];
    }
}

const getCurrentDeviceKey = (identityKey) => `${CURRENT_DEVICE_KEY_PREFIX}${identityKey}`;

export const assertDevice = (device, current = false) => {
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

export const createDevices = async (currentDevice, identityKey, storage) => {
    const currentDeviceKey = getCurrentDeviceKey(identityKey);

    assertCurrentDevice(currentDevice);

    await storage.set(currentDeviceKey, currentDevice, { encrypt: true });

    return new Devices(currentDevice);
};

export const restoreDevices = async (identityKey, storage) => {
    const currentDeviceKey = getCurrentDeviceKey(identityKey);

    const currentDevice = await storage.get(currentDeviceKey);

    assertCurrentDevice(currentDevice);

    return new Devices(currentDevice);
};

export const removeDevices = async (identityKey, storage) => storage.remove(getCurrentDeviceKey(identityKey));
