import createLocalStorage, { isSupported } from '../local-storage';

const createInMemoryGlobalLocalStorage = () => {
    const map = new Map();
    const localStorage = {
        getItem: jest.fn((key) => map.get(key)),
        setItem: jest.fn((key, value) => map.set(key, value)),
        removeItem: jest.fn((key) => map.delete(key)),
        clear: jest.fn(() => map.clear()),
    };

    Object.defineProperty(global, '_localStorage', { value: localStorage, writable: true });
};

const storage = createLocalStorage();

beforeEach(() => {
    createInMemoryGlobalLocalStorage();
});

it('should have all specification methods', () => {
    expect(typeof storage.get).toEqual('function');
    expect(typeof storage.set).toEqual('function');
    expect(typeof storage.remove).toEqual('function');
    expect(typeof storage.clear).toEqual('function');
});

describe('has', () => {
    it('should return false if key is not set', async () => {
        await expect(storage.has('key')).resolves.toEqual(false);
    });

    it('should return true if key is set', async () => {
        localStorage.setItem('foo', '"bar"');

        await expect(storage.has('foo')).resolves.toEqual(true);
    });

    it('should reject if anything goes wrong', async () => {
        localStorage.getItem = () => { throw new Error('foo'); };

        await expect(storage.has()).rejects.toThrow('foo');
    });
});

describe('get', () => {
    it('should return undefined if the key is not set', async () => {
        await expect(storage.get('key')).resolves.toBeUndefined();
    });

    it('should return the correct value', async () => {
        localStorage.setItem('foo', '"bar"');

        await expect(storage.get('foo')).resolves.toEqual('bar');
    });

    it('should reject if anything goes wrong', async () => {
        localStorage.getItem = () => { throw new Error('foo'); };

        await expect(storage.get()).rejects.toThrow('foo');
    });
});

describe('set', () => {
    it('should set a string', async () => {
        await expect(storage.set('foo', 'bar')).resolves.toBeUndefined();

        expect(localStorage.getItem('foo')).toBe(JSON.stringify('bar'));
    });

    it('should set a number', async () => {
        await expect(storage.set('foo', 1)).resolves.toBeUndefined();

        expect(localStorage.getItem('foo')).toBe(JSON.stringify(1));
    });

    it('should set an array', async () => {
        await expect(storage.set('foo', ['a', 1, true])).resolves.toBeUndefined();

        expect(localStorage.getItem('foo')).toBe(JSON.stringify(['a', 1, true]));
    });

    it('should set an object', async () => {
        await expect(storage.set('foo', { a: 'foo', b: 1, c: true })).resolves.toBeUndefined();

        expect(localStorage.getItem('foo')).toBe(JSON.stringify({ a: 'foo', b: 1, c: true }));
    });

    it('should reject if anything goes wrong', async () => {
        localStorage.setItem = () => { throw new Error('foo'); };

        await expect(storage.set('foo', 'bar')).rejects.toThrow('foo');
    });
});

describe('remove', () => {
    it('should remove a key', async () => {
        localStorage.setItem('foo', '"bar"');

        await expect(storage.remove('foo')).resolves.toBeUndefined();

        expect(localStorage.getItem('foo')).toBeUndefined();
    });

    it('should reject if anything goes wrong', async () => {
        localStorage.removeItem = () => { throw new Error('foo'); };

        await expect(storage.remove('foo')).rejects.toThrow('foo');
    });
});

describe('clear', () => {
    it('should clear all keys', async () => {
        localStorage.setItem('foo', '"bar"');
        localStorage.setItem('foz', '"baz"');

        await expect(storage.clear()).resolves.toBeUndefined();

        expect(localStorage.getItem('foo')).toBeUndefined();
        expect(localStorage.getItem('foz')).toBeUndefined();
    });

    it('should reject if anything goes wrong', async () => {
        localStorage.clear = () => { throw new Error('foo'); };

        await expect(storage.clear()).rejects.toThrow('foo');
    });
});

describe('isSupported', () => {
    it('should return true if defined and writable', () => {
        expect(isSupported()).toBe(true);
    });

    it('should return false if defined but not writable', () => {
        localStorage.setItem = () => {};

        expect(isSupported()).toBe(false);
    });

    it('should return false if defined but throws', () => {
        localStorage.setItem = () => { throw new Error('foo'); };

        expect(isSupported()).toBe(false);
    });

    it('should return false if not defined', () => {
        delete global.localStorage;

        expect(isSupported()).toBe(false);
    });
});
