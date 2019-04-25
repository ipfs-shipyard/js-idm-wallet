import { createDevices, removeDevices, restoreDevices, assertDevice } from '../devices';
import * as mocks from './mocks';

beforeEach(() => {
    jest.clearAllMocks();
});

describe('assertDevice', () => {
    it('should assert device successfully', () => {
        expect(() => assertDevice(mocks.mockDevice)).not.toThrow();
    });

    it('should assert device successfully if current device', () => {
        expect(() => assertDevice(mocks.mockDeviceWithPrivateKey, true)).not.toThrow();
    });

    it('should throw with invalid id', () => {
        expect(() => assertDevice({ ...mocks.mockDevice, id: undefined })).toThrow('Invalid device id: undefined');
        expect(() => assertDevice({ ...mocks.mockDevice, id: [1, 2, 3] })).toThrow('Invalid device id: 1,2,3');
        expect(() => assertDevice({ ...mocks.mockDevice, id: 'abcdefd' })).toThrow('Invalid device id: abcdefd');
    });

    it('should throw with invalid type', () => {
        expect(() => assertDevice({ ...mocks.mockDevice, type: 'foo' })).toThrow('Invalid device type: foo');
    });

    it('should throw with invalid name', () => {
        expect(() => assertDevice({ ...mocks.mockDevice, name: undefined })).toThrow('Invalid device name: undefined');
        expect(() => assertDevice({ ...mocks.mockDevice, name: 123 })).toThrow('Invalid device name: 123');
    });

    it('should throw with invalid publicKey', () => {
        expect(() => assertDevice({ ...mocks.mockDevice, publicKey: undefined })).toThrow('Invalid device publicKey: undefined');
        expect(() => assertDevice({ ...mocks.mockDevice, publicKey: null })).toThrow('Invalid device publicKey: null');
    });

    it('should throw with invalid privateKey if current device', () => {
        expect(() => assertDevice({ ...mocks.mockDevice, privateKey: undefined }, true)).toThrow('Invalid device privateKey: undefined');
    });
});

describe('createDevices', () => {
    it('should create devices successfully', async () => {
        const devices = await createDevices(mocks.mockDeviceWithPrivateKey, mocks.mockIdentityKey, mocks.mockStorage);

        expect(typeof devices.getCurrent).toBe('function');
        expect(typeof devices.list).toBe('function');

        expect(mocks.mockStorage.set).toHaveBeenCalledTimes(1);
        expect(mocks.mockStorage.set).toHaveBeenCalledWith(
            'currentDevice!identity!hex123',
            mocks.mockDeviceWithPrivateKey,
            { encrypt: true },
        );
    });

    it('should throw if invalid current device', async () => {
        await expect(createDevices(mocks.mockDevice, mocks.mockIdentityKey, mocks.mockStorage)).rejects.toThrow('Invalid device privateKey: undefined');
    });

    it('should throw if storage error', async () => {
        const mockStorage = {
            ...mocks.mockStorage,
            set: jest.fn(() => Promise.reject(new Error('Storage set error'))),
        };

        await expect(createDevices(mocks.mockDeviceWithPrivateKey, mocks.mockIdentityKey, mockStorage)).rejects.toThrow('Storage set error');

        expect(mockStorage.set).toHaveBeenCalledTimes(1);
        expect(mockStorage.set).toHaveBeenCalledWith('currentDevice!identity!hex123', mocks.mockDeviceWithPrivateKey, { encrypt: true });
    });
});

describe('restoreDevices', () => {
    it('should restore devices successfully', async () => {
        const mockStorage = {
            ...mocks.mockStorage,
            get: jest.fn(() => Promise.resolve(mocks.mockDeviceWithPrivateKey)),
        };

        const devices = await restoreDevices(mocks.mockIdentityKey, mockStorage);

        expect(typeof devices.getCurrent).toBe('function');
        expect(typeof devices.list).toBe('function');

        expect(mockStorage.get).toHaveBeenCalledTimes(1);
        expect(mockStorage.get).toHaveBeenCalledWith('currentDevice!identity!hex123');
    });

    it('should throw with invalid device', async () => {
        const mockStorage = {
            ...mocks.mockStorage,
            get: jest.fn(() => Promise.resolve({ foo: 'bar' })),
        };

        await expect(restoreDevices(mocks.mockIdentityKey, mockStorage)).rejects.toThrow('Invalid device id: undefined');
    });
});

describe('removeDevices', () => {
    it('should remove backup successfully', async () => {
        await removeDevices(mocks.mockIdentityKey, mocks.mockStorage);

        expect(mocks.mockStorage.remove).toHaveBeenCalledTimes(1);
        expect(mocks.mockStorage.remove).toHaveBeenCalledWith('currentDevice!identity!hex123');
    });
});

describe('getCurrent', () => {
    it('should get current successfully', async () => {
        const devices = await createDevices(mocks.mockDeviceWithPrivateKey, mocks.mockIdentityKey, mocks.mockStorage);

        expect(devices.getCurrent()).toEqual(mocks.mockDeviceWithPrivateKey);
    });
});

describe('list', () => {
    it('should list successfully', async () => {
        const devices = await createDevices(mocks.mockDeviceWithPrivateKey, mocks.mockIdentityKey, mocks.mockStorage);
        const list = devices.list();

        expect(list[0]).toEqual(mocks.mockDeviceWithPrivateKey);
    });
});

