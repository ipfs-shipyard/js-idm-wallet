import createLocks from '../index';

describe('createLocks', () => {
    it('should create all lock types correctly', async () => {
        const storage = { has: jest.fn(() => true) };

        const locks = await createLocks(storage, {});

        expect(Object.keys(locks)).toEqual(['passphrase']);

        expect(locks.passphrase.isMaster()).toBeTruthy();
        expect(locks.passphrase.isEnabled()).toBeTruthy();
    });

    it('should create all lock types with non enabled types', async () => {
        const storage = { has: jest.fn(() => false) };

        const locks = await createLocks(storage, {}, 'fingerprint');

        expect(Object.keys(locks)).toEqual(['passphrase']);

        expect(locks.passphrase.isMaster()).toBeFalsy();
        expect(locks.passphrase.isEnabled()).toBeFalsy();
    });

    it('should fail if one of the isEnabled methods rejects', () => {
        const storage = { has: jest.fn(() => Promise.reject(new Error('foo'))) };

        expect(createLocks(storage, {}, 'passphrase')).rejects.toEqual(new Error('foo'));
    });
});
