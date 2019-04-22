import createSecret from '../secret';

const undefinedError = new Error('Not defined');

it('should have all specification methods', () => {
    const secret = createSecret();

    expect(typeof secret.has).toEqual('function');
    expect(typeof secret.get).toEqual('function');
    expect(typeof secret.set).toEqual('function');
    expect(typeof secret.unset).toEqual('function');
    expect(typeof secret.onDefinedChange).toEqual('function');
});

describe('set & get', () => {
    it('should set and get correctly', () => {
        const secret = createSecret();
        const mockSecret = new Uint8Array([1, 2, 3]);

        secret.set(mockSecret);

        expect(secret.get()).toEqual(mockSecret);
    });

    it('should throw if trying to get an undefined secret', () => {
        const secret = createSecret(undefinedError);

        expect(() => secret.get()).toThrowError(undefinedError);
    });
});

describe('has', () => {
    it('should return true if secret is set', () => {
        const secret = createSecret();

        secret.set('foo');

        expect(secret.has()).toBeTruthy();
    });

    it('should return false if secret is ot set', () => {
        const secret = createSecret();

        expect(secret.has()).toBeFalsy();
    });
});

describe('unset', () => {
    it('should unset secret', () => {
        const secret = createSecret();

        secret.set('foo');
        secret.unset();

        expect(secret.has()).toBeFalsy();
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
        expect(secret.get()).toEqual('foo');
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
