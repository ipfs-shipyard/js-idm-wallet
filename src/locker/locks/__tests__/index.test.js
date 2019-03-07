import createLock, { isEnabled } from '../index';

describe('factory', () => {
    it('should create passphrase lock successfully', () => {
        const passphraseLock = createLock('passphrase', {});

        expect(passphraseLock.constructor.name).toEqual('PassphraseLock');
    });

    it('should fail with unknown lock type', () => {
        expect(() => createLock('foo', {})).toThrow('Unavailable lock type');
    });
});

describe('isEnabled', () => {
    it('should be true if lock type in storage', () => {
        const storage = { has: jest.fn(() => true) };

        expect(isEnabled('passphrase', { storage })).resolves.toBeTruthy();
    });

    it('should be false if lock type not in storage', () => {
        const storage = { has: jest.fn(() => false) };

        expect(isEnabled('passphrase', { storage })).resolves.toBeFalsy();
    });

    it('should fail with unknown lock type', () => {
        expect(isEnabled('foo', {})).rejects.toThrow('Unavailable lock type');
    });
});
