import createLocks from '../index';

describe('createLocks', () => {
    it('should create all lock types correctly', async () => {
        const storage = { has: jest.fn(() => true) };

        const locks = await createLocks(storage, {});

        expect(Object.keys(locks)).toEqual(['passphrase']);

        expect(locks.passphrase.isMaster()).toBe(true);
        expect(locks.passphrase.isEnabled()).toBe(true);
    });

    it('should create all lock types with non enabled types', async () => {
        const storage = { has: jest.fn(() => false) };

        const locks = await createLocks(storage, {}, 'fingerprint');

        expect(Object.keys(locks)).toEqual(['passphrase']);

        expect(locks.passphrase.isMaster()).toBe(false);
        expect(locks.passphrase.isEnabled()).toBe(false);
    });

    it('should fail if one of the isEnabled methods rejects', async () => {
        const storage = { has: jest.fn(() => Promise.reject(new Error('foo'))) };

        await expect(createLocks(storage, {}, 'passphrase')).rejects.toThrow('foo');
    });
});
