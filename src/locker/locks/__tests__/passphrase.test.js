import createPassphraseLock from '../passphrase';
import { secret, storedPassphrase, crypto, TextEncoder, enableTest, unlockTest } from './mocks';

const mockSecret = {
    generate: jest.fn(() => secret),
    get: jest.fn(() => secret),
    set: jest.fn(),
};

const mockStorage = {
    has: jest.fn(() => false),
    get: jest.fn(() => undefined),
    set: jest.fn(),
};

global.crypto = crypto;
global.TextEncoder = TextEncoder;

beforeEach(() => {
    jest.clearAllMocks();
});

it('should have all specification methods', async () => {
    const lock = await createPassphraseLock({ storage: mockStorage, secret: mockSecret });

    expect(typeof lock.isMaster).toBe('function');
    expect(typeof lock.isEnabled).toBe('function');
    expect(typeof lock.enable).toBe('function');
    expect(typeof lock.disable).toBe('function');
    expect(typeof lock.update).toBe('function');
    expect(typeof lock.validate).toBe('function');
    expect(typeof lock.unlock).toBe('function');
    expect(typeof lock.onEnabledChange).toBe('function');
});

describe('isMaster', () => {
    it('should return true', async () => {
        const lock = await createPassphraseLock({ storage: mockStorage, master: true });

        expect(lock.isMaster()).toBeTruthy();
    });

    it('should return false', async () => {
        const lock = await createPassphraseLock({ storage: mockStorage });

        expect(lock.isMaster()).toBe(false);
    });
});

describe('isEnabled', () => {
    it('should return true if enabled in the storage', async () => {
        const mockStorage = { has: jest.fn(() => true) };
        const lock = await createPassphraseLock({ storage: mockStorage, master: false });

        expect(lock.isEnabled()).toBeTruthy();
        expect(mockStorage.has).toHaveBeenCalledTimes(1);
    });

    it('should return false if not enabled in the storage', async () => {
        const lock = await createPassphraseLock({ storage: mockStorage });

        expect(lock.isEnabled()).toBe(false);
        expect(mockStorage.has).toHaveBeenCalledTimes(1);
    });
});

describe('enable', () => {
    it('should enable successfully', async () => {
        global.crypto.subtle = {
            importKey: jest.fn(() => enableTest.success.crypto.subtle.importKey.result),
            encrypt: jest.fn(() => enableTest.success.crypto.subtle.encrypt.result),
        };

        const lock = await createPassphraseLock({ storage: mockStorage, secret: mockSecret });

        await lock.enable('walletPassphrase');

        expect(global.crypto.subtle.importKey).toHaveBeenCalledTimes(1);
        expect(global.crypto.subtle.importKey).toHaveBeenCalledWith(...enableTest.success.crypto.subtle.importKey.params);
        expect(global.crypto.subtle.encrypt).toHaveBeenCalledTimes(1);
        expect(global.crypto.subtle.encrypt).toHaveBeenCalledWith(...enableTest.success.crypto.subtle.encrypt.params);

        expect(mockStorage.set.mock.calls[0]).toEqual(['locker.lock.passphrase', storedPassphrase]);

        expect(lock.isEnabled()).toBeTruthy();
    });

    it('should fail if already enabled', async () => {
        const mockStorage = { has: () => true };
        const lock = await createPassphraseLock({ secret: mockSecret, storage: mockStorage });

        await expect(lock.enable('walletPassphrase')).rejects.toThrow('Lock must be disabled');
        expect(lock.isEnabled()).toBeTruthy();
    });

    it('should fail if passphrase is too weak', async () => {
        const lock = await createPassphraseLock({ secret: mockSecret, storage: mockStorage });

        await expect(lock.enable('foo')).rejects.toThrow('Passphrase is too weak');
        expect(lock.isEnabled()).toBe(false);
    });

    it('should fail if no secret available', async () => {
        const mockSecret = { get: () => { throw new Error('No secret available'); } };
        const lock = await createPassphraseLock({ secret: mockSecret, storage: mockStorage });

        await expect(lock.enable('walletPassphrase')).rejects.toThrow('No secret available');
        expect(lock.isEnabled()).toBe(false);
    });
});

describe('disable', () => {
    it('should disable successfully', async () => {
        const mockStorage = { has: () => true, remove: jest.fn() };
        const lock = await createPassphraseLock({ storage: mockStorage, secret: mockSecret });

        await lock.disable();

        expect(mockStorage.remove).toHaveBeenCalledTimes(1);
        expect(mockStorage.remove).toHaveBeenCalledWith('locker.lock.passphrase');
        expect(lock.isEnabled()).toBe(false);
    });

    it('should fail if not enabled', async () => {
        const lock = await createPassphraseLock({ storage: mockStorage, secret: mockSecret });

        await expect(lock.disable()).rejects.toThrow('Lock must be enabled');
        expect(lock.isEnabled()).toBe(false);
    });

    it('should fail if master', async () => {
        const mockStorage = { has: () => true };
        const lock = await createPassphraseLock({ storage: mockStorage, secret: mockSecret, master: true });

        await expect(lock.disable()).rejects.toThrow('Invalid master lock operation');
        expect(lock.isEnabled()).toBeTruthy();
    });
});

describe('unlock', () => {
    it('should unlock successfully', async () => {
        global.crypto.subtle = {
            importKey: jest.fn(() => unlockTest.success.crypto.subtle.importKey.result),
            decrypt: jest.fn(() => unlockTest.success.crypto.subtle.decrypt.result),
        };

        const mockStorage = { has: () => true, get: jest.fn(() => storedPassphrase) };
        const lock = await createPassphraseLock({ storage: mockStorage, secret: mockSecret });

        await lock.unlock('walletPassphrase');

        expect(global.crypto.subtle.importKey).toHaveBeenCalledTimes(1);
        expect(global.crypto.subtle.importKey).toHaveBeenCalledWith(...unlockTest.success.crypto.subtle.importKey.params);
        expect(global.crypto.subtle.decrypt).toHaveBeenCalledTimes(1);
        expect(global.crypto.subtle.decrypt).toHaveBeenCalledWith(...unlockTest.success.crypto.subtle.decrypt.params);

        expect(mockSecret.set).toHaveBeenCalledWith(secret);
    });

    it('should fail if no derived key stored', async () => {
        const mockStorage = { has: () => true, get: jest.fn(() => ({ ...storedPassphrase, derivedKey: undefined })) };
        const lock = await createPassphraseLock({ storage: mockStorage, secret: mockSecret });

        await expect(lock.unlock('walletPassphrase')).rejects.toThrow();
    });

    it('should fail if no encrypted secret stored', async () => {
        const mockStorage = { has: () => true, get: () => ({ ...storedPassphrase, encryptedSecret: undefined }) };
        const lock = await createPassphraseLock({ storage: mockStorage, secret: mockSecret });

        await expect(lock.unlock('walletPassphrase')).rejects.toThrow();
    });

    it('should fail with password mismatch if decrypt fails', async () => {
        global.crypto.subtle = {
            importKey: () => unlockTest.success.crypto.subtle.importKey.result,
            decrypt: () => { throw new Error('foo'); },
        };

        const mockStorage = { has: () => true, get: () => storedPassphrase };
        const lock = await createPassphraseLock({ storage: mockStorage, secret: mockSecret });

        await expect(lock.unlock('walletPassphrase')).rejects.toThrow('Passphrase is invalid');
    });

    it('should fail if not enabled', async () => {
        const lock = await createPassphraseLock({ storage: mockStorage, secret: mockSecret });

        await expect(lock.disable()).rejects.toThrow('Lock must be enabled');
        expect(lock.isEnabled()).toBe(false);
    });
});

describe('update', () => {
    it('should update master successfully', async () => {
        global.crypto.subtle = {
            importKey: jest.fn(() => unlockTest.success.crypto.subtle.importKey.result),
            encrypt: jest.fn(() => enableTest.success.crypto.subtle.encrypt.result),
            decrypt: jest.fn(() => unlockTest.success.crypto.subtle.decrypt.result),
        };

        let stored = storedPassphrase;
        const mockStorage = {
            has: () => true,
            get: jest.fn(() => stored),
            set: jest.fn(() => { stored = storedPassphrase; }),
        };

        const lock = await createPassphraseLock({ storage: mockStorage, secret: mockSecret, master: true });

        await lock.update('passphraseWallet', 'walletPassphrase');

        expect(global.crypto.subtle.importKey).toHaveBeenCalledTimes(2);
        expect(global.crypto.subtle.importKey).toHaveBeenCalledWith(...unlockTest.success.crypto.subtle.importKey.params);
        expect(global.crypto.subtle.encrypt).toHaveBeenCalledTimes(1);
        expect(global.crypto.subtle.encrypt).not.toHaveBeenCalledWith(...enableTest.success.crypto.subtle.encrypt.params);
        expect(global.crypto.subtle.decrypt).toHaveBeenCalledTimes(1);
        expect(global.crypto.subtle.decrypt).toHaveBeenCalledWith(...unlockTest.success.crypto.subtle.decrypt.params);

        expect(mockStorage.get).toHaveBeenCalledTimes(1);
        expect(mockStorage.set).toHaveBeenCalledTimes(1);

        await lock.unlock('walletPassphrase');
    });

    it('should update non master successfully', async () => {
        global.crypto.subtle = {
            importKey: jest.fn(() => unlockTest.success.crypto.subtle.importKey.result),
            encrypt: jest.fn(() => enableTest.success.crypto.subtle.encrypt.result),
            decrypt: jest.fn(() => unlockTest.success.crypto.subtle.decrypt.result),
        };

        let stored = storedPassphrase;
        const mockStorage = {
            has: () => true,
            get: jest.fn(() => stored),
            set: jest.fn(() => { stored = storedPassphrase; }),
        };

        const lock = await createPassphraseLock({ storage: mockStorage, secret: mockSecret });

        await lock.update('passphraseWallet', 'walletPassphrase');

        expect(global.crypto.subtle.importKey).toHaveBeenCalledTimes(1);
        expect(global.crypto.subtle.importKey).not.toHaveBeenCalledWith(...unlockTest.success.crypto.subtle.importKey.params);
        expect(global.crypto.subtle.decrypt).toHaveBeenCalledTimes(0);
        expect(global.crypto.subtle.encrypt).toHaveBeenCalledTimes(1);
        expect(global.crypto.subtle.encrypt).not.toHaveBeenCalledWith(...enableTest.success.crypto.subtle.encrypt.params);

        expect(mockStorage.get).toHaveBeenCalledTimes(0);
        expect(mockStorage.set).toHaveBeenCalledTimes(1);

        await lock.unlock('walletPassphrase');
    });

    it('should fail if not enabled', async () => {
        const mockStorage = { has: () => false };
        const lock = await createPassphraseLock({ storage: mockStorage, secret: mockSecret });

        await expect(lock.update('passphraseWallet', 'walletPassphrase')).rejects.toThrow('Lock must be enabled');
    });

    it('should fail if new passphrase is too weak', async () => {
        const mockStorage = { has: () => true };
        const lock = await createPassphraseLock({ storage: mockStorage, secret: mockSecret });

        await expect(lock.update('123', 'walletPassphrase')).rejects.toThrow('Passphrase is too weak');
    });

    it('should fail if master and current passphrase is wrong', async () => {
        global.crypto.subtle = {
            importKey: jest.fn(() => unlockTest.success.crypto.subtle.importKey.result),
            decrypt: jest.fn(() => { throw new Error('foo'); }),
        };

        const mockStorage = { has: () => true, get: () => storedPassphrase };
        const lock = await createPassphraseLock({ storage: mockStorage, secret: mockSecret, master: true });

        await expect(lock.update('passphraseWallet', 'fooBar')).rejects.toThrow('Passphrase is invalid');
    });
});

describe('onEnabledChange', () => {
    it('should add callback to be called on enable change', async () => {
        const handleEnabledChange = jest.fn();
        const handleEnabledChange2 = jest.fn();
        const mockStorage = { has: () => false, set: jest.fn() };

        global.crypto.subtle = {
            importKey: jest.fn(() => enableTest.success.crypto.subtle.importKey.result),
            encrypt: jest.fn(() => enableTest.success.crypto.subtle.encrypt.result),
        };

        const lock = await createPassphraseLock({ storage: mockStorage, secret: mockSecret });
        const removeMethod = lock.onEnabledChange(handleEnabledChange2);

        lock.onEnabledChange(handleEnabledChange);
        removeMethod();
        await lock.enable('walletPassphrase');

        expect(handleEnabledChange).toBeCalledTimes(1);
        expect(handleEnabledChange).toHaveBeenCalledWith(true);
        expect(handleEnabledChange2).toBeCalledTimes(0);
    });
});
