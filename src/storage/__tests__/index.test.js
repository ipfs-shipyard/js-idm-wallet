import * as mocks from './mocks';
import level from 'level';
import createStorage from '../index';

jest.mock('level', () => mocks.mockCreateLevel());
jest.mock('../../utils/aes-gcm', () => mocks.mockCreateAesGcm());

beforeEach(() => {
    jest.clearAllMocks();
});

describe('createStorage', () => {
    it('should create storage successfully', async () => {
        const storage = await createStorage();

        expect(typeof storage.has).toBe('function');
        expect(typeof storage.get).toBe('function');
        expect(typeof storage.set).toBe('function');
        expect(typeof storage.remove).toBe('function');
        expect(typeof storage.clear).toBe('function');
        expect(typeof storage.list).toBe('function');
    });
});

describe('get', () => {
    it('should get value correctly', async () => {
        const storage = await createStorage();

        await expect(storage.get('foo')).resolves.toBe('foo-value');

        expect(mocks.mockGet).toHaveBeenCalledTimes(1);
        expect(mocks.mockGet).toHaveBeenCalledWith('foo');
        expect(mocks.mockDecrypt).toHaveBeenCalledTimes(0);
    });

    it('should get encrypted value correctly', async () => {
        const mockGet = jest.fn(() => Promise.resolve(mocks.mockEncryptedDataStringified));

        level.mockImplementationOnce(mocks.mockCreateLevel({ get: mockGet }));
        mocks.mockTextDecoder();

        const storage = await createStorage(mocks.mockSecret);

        await expect(storage.get('foo')).resolves.toEqual({ foo: 'bar' });

        expect(mocks.mockSecret.get).toHaveBeenCalledTimes(1);
        expect(mocks.mockDecrypt).toHaveBeenCalledTimes(1);
        expect(mocks.mockDecrypt).toHaveBeenCalledWith(mocks.mockEncryptCypherTextBytes, mocks.mockEncryptCypherIvBytes, mocks.mockSecretValue);
        expect(mocks.mockDecode).toHaveBeenCalledTimes(1);
        expect(mocks.mockDecode).toHaveBeenCalledWith(mocks.mockEncryptedDataBytes);
    });

    it('should return undefined if no value found', async () => {
        const mockError = Object.assign(new Error('Not Found'), { type: 'NotFoundError' });
        const mockGet = jest.fn(() => Promise.reject(mockError));

        level.mockImplementationOnce(mocks.mockCreateLevel({ get: mockGet }));

        const storage = await createStorage();

        await expect(storage.get('foo')).resolves.toBe(undefined);
    });

    it('should throw if something went wrong', async () => {
        const mockGet = jest.fn(() => Promise.reject(new Error('foobar')));

        level.mockImplementationOnce(mocks.mockCreateLevel({ get: mockGet }));

        const storage = await createStorage();

        await expect(storage.get('foo')).rejects.toThrow('foobar');
    });
});

describe('has', () => {
    it('should return true if available in storage', async () => {
        const storage = await createStorage();

        await expect(storage.has('foo')).resolves.toBe(true);
    });

    it('should return false if not available in storage', async () => {
        level.mockImplementationOnce(mocks.mockCreateLevel({ get: () => undefined }));

        const storage = await createStorage();

        await expect(storage.has('foo')).resolves.toBe(false);
    });

    it('should return false if no value found', async () => {
        const mockError = Object.assign(new Error('Not Found'), { type: 'NotFoundError' });
        const mockGet = jest.fn(() => Promise.reject(mockError));

        level.mockImplementationOnce(mocks.mockCreateLevel({ get: mockGet }));

        const storage = await createStorage();

        await expect(storage.has('foo')).resolves.toBe(false);
    });

    it('should throw if something went wrong', async () => {
        const mockGet = jest.fn(() => Promise.reject(new Error('foobar')));

        level.mockImplementationOnce(mocks.mockCreateLevel({ get: mockGet }));

        const storage = await createStorage();

        await expect(storage.has('foo')).rejects.toThrow('foobar');
    });
});

describe('set', () => {
    it('should set key value pair successfully', async () => {
        const storage = await createStorage();

        await expect(storage.set('foo', 'bar')).resolves.toEqual({ key: 'foo', value: '"bar"' });

        expect(mocks.mockPut).toHaveBeenCalledTimes(1);
        expect(mocks.mockPut).toHaveBeenCalledWith('foo', '"bar"');
        expect(mocks.mockEncrypt).toHaveBeenCalledTimes(0);
    });

    it('should set encrypted value successfully', async () => {
        mocks.mockTextEncoder();

        const storage = await createStorage(mocks.mockSecret);
        const expected = {
            key: 'foo',
            value: mocks.mockEncryptedDataStringified,
        };

        await expect(storage.set('foo', { foo: 'bar' }, { encrypt: true })).resolves.toEqual(expected);

        expect(mocks.mockPut).toHaveBeenCalledTimes(1);
        expect(mocks.mockPut).toHaveBeenCalledWith('foo', mocks.mockEncryptedDataStringified);
        expect(mocks.mockEncrypt).toHaveBeenCalledTimes(1);
        expect(mocks.mockEncrypt).toHaveBeenCalledWith(mocks.mockEncryptedDataBytes, mocks.mockSecretValue);
        expect(mocks.mockEncode).toHaveBeenCalledTimes(1);
        expect(mocks.mockEncode).toHaveBeenCalledWith(mocks.mockData);
    });

    it('should throw if something went wrong', async () => {
        const mockPut = jest.fn(() => Promise.reject(new Error('foobar')));

        level.mockImplementationOnce(mocks.mockCreateLevel({ put: mockPut }));

        const storage = await createStorage();

        await expect(storage.set('foo', 'bar')).rejects.toThrow('foobar');
    });
});

describe('remove', () => {
    it('should remove successfully', async () => {
        const storage = await createStorage();

        await expect(storage.remove('foo')).resolves.toEqual();

        expect(mocks.mockDel).toHaveBeenCalledTimes(1);
        expect(mocks.mockDel).toHaveBeenCalledWith('foo');
    });

    it('should throw if something went wrong', async () => {
        const mockDel = jest.fn(() => Promise.reject(new Error('foobar')));

        level.mockImplementationOnce(mocks.mockCreateLevel({ del: mockDel }));

        const storage = await createStorage();

        await expect(storage.remove('foo')).rejects.toThrow('foobar');
    });
});

describe('clear', () => {
    it('should clear successfully', async () => {
        const storage = await createStorage();

        await storage.clear();

        const mockReadStream = mocks.mockCreateReadStream.mock.results[0].value;

        expect(Object.keys(mockReadStream.events)).toEqual(['data', 'end', 'error']);
        expect(mocks.mockBatch).toHaveBeenCalledTimes(1);
        expect(mocks.mockBatch).toHaveBeenCalledWith([{ key: 1, type: 'del' }, { key: 2, type: 'del' }]);
    });

    it('should throw if something went wrong', async () => {
        const mockBatch = jest.fn(() => Promise.reject(new Error('foobar')));

        level.mockImplementationOnce(mocks.mockCreateLevel({ batch: mockBatch }));

        const storage = await createStorage();

        await expect(storage.clear()).rejects.toThrow('foobar');
    });
});

describe('list', () => {
    it('should list successfully', async () => {
        const storage = await createStorage();

        await expect(storage.list()).resolves.toEqual([{ key: 1, value: 123 }, { key: 2, value: { a: 1 } }]);

        const mockReadStream = mocks.mockCreateReadStream.mock.results[0].value;

        expect(Object.keys(mockReadStream.events)).toEqual(['data', 'end', 'error']);
        expect(mocks.mockDecrypt).toHaveBeenCalledTimes(0);
    });

    it('should list only values successfully', async () => {
        const storage = await createStorage();

        await expect(storage.list({ keys: false })).resolves.toEqual([123, { a: 1 }]);

        const mockReadStream = mocks.mockCreateReadStream.mock.results[0].value;

        expect(Object.keys(mockReadStream.events)).toEqual(['data', 'end', 'error']);
        expect(mocks.mockDecrypt).toHaveBeenCalledTimes(0);
    });

    it('should list and decrypt values', async () => {
        mocks.mockCreateReadStream.mockImplementationOnce(jest.fn((options) => new mocks.MockReadStream([
            { key: 1, value: '123' },
            { key: 2, value: mocks.mockEncryptedDataStringified },
        ], options)));

        const storage = await createStorage(mocks.mockSecret);

        await expect(storage.list()).resolves.toEqual([{ key: 1, value: 123 }, { key: 2, value: { foo: 'bar' } }]);

        const mockReadStream = mocks.mockCreateReadStream.mock.results[0].value;

        expect(Object.keys(mockReadStream.events)).toEqual(['data', 'end', 'error']);
        expect(mocks.mockDecrypt).toHaveBeenCalledTimes(1);
    });

    it('should throw if something went wrong', async () => {
        const mockCreateReadStream = jest.fn(() => { throw new Error('foobar'); });

        level.mockImplementationOnce(mocks.mockCreateLevel({ createReadStream: mockCreateReadStream }));

        const storage = await createStorage();

        await expect(storage.list()).rejects.toThrow('foobar');
    });
});
