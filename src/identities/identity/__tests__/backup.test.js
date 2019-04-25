import { createBackup, restoreBackup, removeBackup } from '../backup';
import * as mocks from './mocks';

beforeEach(() => {
    jest.clearAllMocks();
});

describe('createBackup', () => {
    it('should create backup successfully', async () => {
        const backup = await createBackup(mocks.mockBackupData, mocks.mockIdentityKey, mocks.mockStorage);

        expect(typeof backup.isComplete).toBe('function');
        expect(typeof backup.getData).toBe('function');
        expect(typeof backup.setComplete).toBe('function');
        expect(typeof backup.onComplete).toBe('function');
    });

    it('should throw if invalid data', async () => {
        await expect(createBackup({ mnemonic: undefined })).rejects.toThrow('Invalid backup mnemonic: undefined');
        await expect(createBackup({ mnemonic: 123 })).rejects.toThrow('Invalid backup mnemonic: 123');
        await expect(createBackup({ mnemonic: 'a1 b2 c3' })).rejects.toThrow('Invalid backup mnemonic: a1 b2 c3');
    });
});

describe('restoreBackup', () => {
    it('should restore backup successfully', async () => {
        const mockStorage = {
            ...mocks.mockStorage,
            get: jest.fn(() => Promise.resolve(mocks.mockBackupData)),
        };

        const backup = await restoreBackup(mocks.mockIdentityKey, mockStorage);

        expect(typeof backup.isComplete).toBe('function');
        expect(typeof backup.getData).toBe('function');
        expect(typeof backup.setComplete).toBe('function');
        expect(typeof backup.onComplete).toBe('function');
    });

    it('should create backup instance without data', async () => {
        const mockStorage = {
            ...mocks.mockStorage,
            get: jest.fn(() => Promise.resolve(undefined)),
        };

        const backup = await restoreBackup(mocks.mockIdentityKey, mockStorage);

        expect(typeof backup.isComplete).toBe('function');
        expect(typeof backup.getData).toBe('function');
        expect(typeof backup.setComplete).toBe('function');
        expect(typeof backup.onComplete).toBe('function');
    });

    it('should throw with invalid data', async () => {
        const mockStorage = {
            ...mocks.mockStorage,
            get: jest.fn(() => Promise.resolve({ foo: 'bar' })),
        };

        await expect(restoreBackup(mocks.mockIdentityKey, mockStorage)).rejects.toThrow('Invalid backup mnemonic: undefined');
    });
});

describe('removeBackup', () => {
    it('should remove backup successfully', async () => {
        await removeBackup(mocks.mockIdentityKey, mocks.mockStorage);

        expect(mocks.mockStorage.remove).toHaveBeenCalledTimes(1);
        expect(mocks.mockStorage.remove).toHaveBeenCalledWith('backup!identity!hex123');
    });
});

describe('isComplete', () => {
    it('should return false if has backup data', async () => {
        const backup = await createBackup(mocks.mockBackupData, mocks.mockIdentityKey, mocks.mockStorage);

        expect(backup.isComplete()).toBe(false);
    });

    it('should return true if has no backup data', async () => {
        const backup = await createBackup(undefined, mocks.mockIdentityKey, mocks.mockStorage);

        expect(backup.isComplete()).toBe(true);
    });
});

describe('getData', () => {
    it('should return backup data', async () => {
        const backup = await createBackup(mocks.mockBackupData, mocks.mockIdentityKey, mocks.mockStorage);

        expect(backup.getData()).toBe(mocks.mockBackupData);
    });
});

describe('setComplete', () => {
    it('should complete backup correctly', async () => {
        const onComplete = jest.fn();

        const backup = await createBackup(mocks.mockBackupData, mocks.mockIdentityKey, mocks.mockStorage);

        backup.onComplete(onComplete);

        await backup.setComplete();

        expect(mocks.mockStorage.remove).toHaveBeenCalledTimes(1);
        expect(mocks.mockStorage.remove).toHaveBeenCalledWith('backup!identity!hex123');

        expect(backup.isComplete()).toBe(true);
        expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('should resolve if backup already complete', async () => {
        const backup = await createBackup(undefined, mocks.mockIdentityKey, mocks.mockStorage);

        await backup.setComplete();

        expect(mocks.mockStorage.remove).toHaveBeenCalledTimes(0);

        expect(backup.isComplete()).toBe(true);
    });

    it('should fail if remove storage is unsuccessfull', async () => {
        const mockStorage = {
            ...mocks.mockStorage,
            remove: jest.fn(() => Promise.reject(new Error('Storage remove error'))),
        };

        const backup = await createBackup(mocks.mockBackupData, mocks.mockIdentityKey, mockStorage);

        await expect(backup.setComplete()).rejects.toThrow('Storage remove error');

        expect(mockStorage.remove).toHaveBeenCalledTimes(1);
        expect(mockStorage.remove).toHaveBeenCalledWith('backup!identity!hex123');

        expect(backup.isComplete()).toBe(false);
    });
});
