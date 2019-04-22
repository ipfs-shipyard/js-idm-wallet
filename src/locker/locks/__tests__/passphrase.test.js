import createPassphraseLock, { isEnabled } from '../passphrase';
import { secret, storedPassphrase, crypto, TextEncoder, enableTest, unlockTest } from './mocks';

const mockSecret = {
    generate: jest.fn(() => secret),
    get: jest.fn(() => secret),
    set: jest.fn(),
};

global.crypto = crypto;
global.TextEncoder = TextEncoder;

it('should have all specification methods', () => {
    const lock = createPassphraseLock();

    expect(typeof lock.isMaster).toEqual('function');
    expect(typeof lock.isEnabled).toEqual('function');
    expect(typeof lock.enable).toEqual('function');
    expect(typeof lock.disable).toEqual('function');
    expect(typeof lock.update).toEqual('function');
    expect(typeof lock.validate).toEqual('function');
    expect(typeof lock.unlock).toEqual('function');
    expect(typeof lock.onEnabledChange).toEqual('function');
});

describe('isMaster', () => {
    it('should return true', () => {
        const lock = createPassphraseLock({ master: true });

        expect(lock.isMaster()).toBeTruthy();
    });

    it('should return false', () => {
        const lock = createPassphraseLock();

        expect(lock.isMaster()).toBeFalsy();
    });
});

describe('isEnabled', () => {
    it('should return true if enabled at declaration', () => {
        const mockStorage = { has: jest.fn() };
        const lock = createPassphraseLock({ storage: mockStorage, master: false, enabled: true });

        expect(lock.isEnabled()).toBeTruthy();
        expect(mockStorage.has).toHaveBeenCalledTimes(0);
    });

    it('should return false if not enabled at declaration', () => {
        const lock = createPassphraseLock();

        expect(lock.isEnabled()).toBeFalsy();
    });

    describe('exported isEnabled', () => {
        it('should return true if available in storage', () => {
            const mockStorage = { has: jest.fn(() => true) };

            expect(isEnabled(mockStorage)).resolves.toBeTruthy();
            expect(mockStorage.has).toHaveBeenCalledWith('locker.lock.passphrase');
        });

        it('should return false if not available in storage', () => {
            const mockStorage = { has: jest.fn(() => false) };

            expect(isEnabled(mockStorage)).resolves.toBeFalsy();
            expect(mockStorage.has).toHaveBeenCalledWith('locker.lock.passphrase');
        });
    });
});

describe('enable', () => {
    it('should enable successfully', async () => {
        const mockStorage = { set: jest.fn() };

        global.crypto.subtle = {
            importKey: jest.fn(() => enableTest.success.crypto.subtle.importKey.result),
            encrypt: jest.fn(() => enableTest.success.crypto.subtle.encrypt.result),
        };

        const lock = createPassphraseLock({ storage: mockStorage, secret: mockSecret, master: false, enabled: false });

        await lock.enable('walletPassphrase');

        expect(global.crypto.subtle.importKey).toHaveBeenCalledTimes(1);
        expect(global.crypto.subtle.importKey).toHaveBeenCalledWith(...enableTest.success.crypto.subtle.importKey.params);

        expect(global.crypto.subtle.encrypt).toHaveBeenCalledTimes(1);
        expect(global.crypto.subtle.encrypt).toHaveBeenCalledWith(...enableTest.success.crypto.subtle.encrypt.params);

        expect(mockStorage.set.mock.calls[0]).toEqual(['locker.lock.passphrase', storedPassphrase]);

        expect(lock.isEnabled()).toBeTruthy();
    });

    it('should fail if already enabled', () => {
        const lock = createPassphraseLock({ master: false, enabled: true });

        expect(lock.enable('walletPassphrase')).rejects.toThrow('Lock must be disabled');
        expect(lock.isEnabled()).toBeTruthy();
    });

    it('should fail if passphrase is too weak', () => {
        const lock = createPassphraseLock({ master: false, enabled: false });

        expect(lock.enable('foo')).rejects.toThrow('Passphrase is too weak');
        expect(lock.isEnabled()).toBeFalsy();
    });

    it('should fail if no secret available', () => {
        const mockSecret = { get: () => { throw new Error('No secret available'); } };
        const lock = createPassphraseLock({ secret: mockSecret, master: false, enabled: false });

        expect(lock.enable('walletPassphrase')).rejects.toThrow('No secret available');
        expect(lock.isEnabled()).toBeFalsy();
    });
});

describe('disable', () => {
    it('should disable successfully', async () => {
        const mockStorage = { remove: jest.fn() };
        const lock = createPassphraseLock({ storage: mockStorage, secret: mockSecret, master: false, enabled: true });

        await lock.disable();

        expect(mockStorage.remove).toHaveBeenCalledTimes(1);
        expect(mockStorage.remove).toHaveBeenCalledWith('locker.lock.passphrase');
        expect(lock.isEnabled()).toBeFalsy();
    });

    it('should fail if not enabled', () => {
        const lock = createPassphraseLock({ master: false, enabled: false });

        expect(lock.disable()).rejects.toThrow('Lock must be enabled');
        expect(lock.isEnabled()).toBeFalsy();
    });

    it('should fail if master', () => {
        const lock = createPassphraseLock({ master: true, enabled: true });

        expect(lock.disable()).rejects.toThrow('Invalid master lock operation');
        expect(lock.isEnabled()).toBeTruthy();
    });
});

describe('unlock', () => {
    it('should unlock successfully', async () => {
        global.crypto.subtle = {
            importKey: jest.fn(() => unlockTest.success.crypto.subtle.importKey.result),
            decrypt: jest.fn(() => unlockTest.success.crypto.subtle.decrypt.result),
        };

        const mockStorage = { get: jest.fn(() => storedPassphrase) };

        const lock = createPassphraseLock({ storage: mockStorage, secret: mockSecret, master: false, enabled: true });

        await lock.unlock('walletPassphrase');

        expect(global.crypto.subtle.importKey).toHaveBeenCalledTimes(1);
        expect(global.crypto.subtle.importKey).toHaveBeenCalledWith(...unlockTest.success.crypto.subtle.importKey.params);

        expect(global.crypto.subtle.decrypt).toHaveBeenCalledTimes(1);
        expect(global.crypto.subtle.decrypt).toHaveBeenCalledWith(...unlockTest.success.crypto.subtle.decrypt.params);

        expect(mockSecret.set).toHaveBeenCalledWith(secret);
    });

    it('should fail if no derived key stored', () => {
        const mockStorage = { get: jest.fn(() => ({ ...storedPassphrase, derivedKey: undefined })) };
        const lock = createPassphraseLock({ storage: mockStorage, secret: mockSecret, master: false });

        expect(lock.unlock('walletPassphrase')).rejects.toThrow();
    });

    it('should fail if no encrypted secret stored', () => {
        const mockStorage = { get: jest.fn(() => ({ ...storedPassphrase, encryptedSecret: undefined })) };
        const lock = createPassphraseLock({ storage: mockStorage, secret: mockSecret, master: false });

        expect(lock.unlock('walletPassphrase')).rejects.toThrow();
    });

    it('should fail with password mismatch if decrypt fails', () => {
        global.crypto.subtle = {
            importKey: jest.fn(() => unlockTest.success.crypto.subtle.importKey.result),
            decrypt: jest.fn(() => { throw new Error('foo'); }),
        };

        const mockStorage = { get: jest.fn(() => storedPassphrase) };

        const lock = createPassphraseLock({ storage: mockStorage, secret: mockSecret, master: false, enabled: true });

        expect(lock.unlock('walletPassphrase')).rejects.toThrow('Passphrase is invalid');
    });
});

describe('update', () => {
    it('should update master successfully', async () => {
        const mockStorage = {
            get: jest.fn(() => storedPassphrase),
            set: jest.fn(),
        };

        global.crypto.subtle = {
            importKey: jest.fn(() => unlockTest.success.crypto.subtle.importKey.result),
            encrypt: jest.fn(() => enableTest.success.crypto.subtle.encrypt.result),
            decrypt: jest.fn(() => unlockTest.success.crypto.subtle.decrypt.result),
        };

        const lock = createPassphraseLock({ storage: mockStorage, secret: mockSecret, master: true, enabled: true });

        await lock.update('passphraseWallet', 'walletPassphrase');
    });

    it('should update non master successfully', async () => {
        const mockStorage = { set: jest.fn() };

        global.crypto.subtle = {
            importKey: jest.fn(() => enableTest.success.crypto.subtle.importKey.result),
            encrypt: jest.fn(() => enableTest.success.crypto.subtle.encrypt.result),
        };

        const lock = createPassphraseLock({ storage: mockStorage, secret: mockSecret, master: false, enabled: true });

        await lock.update('passphraseWallet', 'walletPassphrase');
    });

    it('should fail if not enabled', async () => {
        const lock = createPassphraseLock({ secret: mockSecret, master: false });

        expect(lock.update('passphraseWallet', 'walletPassphrase')).rejects.toThrow('Lock must be enabled');
    });

    it('should fail if new passphrase is too weak', async () => {
        const lock = createPassphraseLock({ master: false, enabled: true });

        expect(lock.update('123', 'walletPassphrase')).rejects.toThrow('Passphrase is too weak');
    });

    it('should fail if unlock is unsuccessful', async () => {
        const lock = createPassphraseLock({ master: false, enabled: false });

        expect(lock.update('passphraseWallet', 'fooBar')).rejects.toThrow('Lock must be enabled');
    });
});

describe('onEnabledChange', () => {
    it('should add callback to be called on enable change', async () => {
        const handleEnabledChange = jest.fn();
        const handleEnabledChange2 = jest.fn();
        const mockStorage = { set: jest.fn() };

        global.crypto.subtle = {
            importKey: jest.fn(() => enableTest.success.crypto.subtle.importKey.result),
            encrypt: jest.fn(() => enableTest.success.crypto.subtle.encrypt.result),
        };

        const lock = createPassphraseLock({ storage: mockStorage, secret: mockSecret, master: false });
        const removeMethod = lock.onEnabledChange(handleEnabledChange2);

        lock.onEnabledChange(handleEnabledChange);
        removeMethod();
        await lock.enable('walletPassphrase');

        expect(handleEnabledChange).toBeCalledTimes(1);
        expect(handleEnabledChange).toHaveBeenCalledWith(true);
        expect(handleEnabledChange2).toBeCalledTimes(0);
    });
});
