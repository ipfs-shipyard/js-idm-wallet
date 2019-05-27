import createSecret from '../index';

const undefinedError = new Error('Not defined');

it('should have all specification methods', () => {
    const secret = createSecret();

    expect(typeof secret.has).toBe('function');
    expect(typeof secret.get).toBe('function');
    expect(typeof secret.set).toBe('function');
    expect(typeof secret.unset).toBe('function');
    expect(typeof secret.onDefinedChange).toBe('function');
});

describe('set & get', () => {
    it('should set and get correctly', () => {
        const secret = createSecret();
        const mockSecret = new Uint8Array([1, 2, 3]);

        secret.set(mockSecret);

        expect(secret.get()).toBe(mockSecret);
    });

    it('should throw if trying to get an undefined secret', () => {
        const secret = createSecret(undefinedError);

        expect(() => secret.get()).toThrowError(undefinedError);
    });
});

describe('getAsync', () => {
    it('should resolve when the value is set', () => {
        const secret = createSecret();
        const mockSecret = new Uint8Array([1, 2, 3]);

        const promise = secret.getAsync();

        secret.set(mockSecret);

        expect(promise).resolves.toBe(mockSecret);
    });
});

describe('has', () => {
    it('should return true if secret is set', () => {
        const secret = createSecret();

        secret.set('foo');

        expect(secret.has()).toBe(true);
    });

    it('should return false if secret is ot set', () => {
        const secret = createSecret();

        expect(secret.has()).toBe(false);
    });
});

describe('unset', () => {
    it('should unset secret', () => {
        const secret = createSecret();

        secret.set('foo');
        secret.unset();

        expect(secret.has()).toBe(false);
    });
});

describe('generate', () => {
    it('should generate secret', () => {
        const mockGetRandomValues = jest.fn(() => 'foo');

        global.crypto = { getRandomValues: mockGetRandomValues };

        const secret = createSecret(undefinedError);

        secret.generate();

        expect(mockGetRandomValues).toHaveBeenCalledTimes(1);
        expect(mockGetRandomValues.mock.calls[0][0]).toHaveLength(32);
        expect(secret.get()).toBe('foo');
    });
});

describe('onDefinedChange', () => {
    it('should add callback to be called on definition change', () => {
        const secret = createSecret();
        const handleDefinedChange = jest.fn();

        secret.onDefinedChange(handleDefinedChange);
        secret.unset();
        secret.set('foo');
        secret.set('bar');
        secret.unset();

        expect(handleDefinedChange).toHaveBeenCalledTimes(2);
    });

    it('should add callback and return remove method', () => {
        const secret = createSecret();
        const handleDefinedChange = jest.fn();

        const remove = secret.onDefinedChange(handleDefinedChange);

        remove();
        secret.set('foo');

        expect(handleDefinedChange).toHaveBeenCalledTimes(0);
    });
});
