import createIpid from '../methods/ipid';
import createDid from '../index';
import { mockDocument, mockIpid } from './mocks';

jest.mock('../methods/ipid', () => jest.fn(() => mockIpid));

beforeEach(() => {
    jest.clearAllMocks();
});

it('should have all specification methods', async () => {
    const did = createDid();

    expect(typeof did.resolve).toBe('function');
    expect(typeof did.create).toBe('function');
    expect(typeof did.update).toBe('function');
    expect(typeof did.isPublicKeyValid).toBe('function');
    expect(typeof did.getMethods).toBe('function');
});

describe('getMethods', () => {
    it('should return all available methods and its information', async () => {
        const did = createDid();

        expect(did.getMethods()).toMatchSnapshot();
    });
});

describe('resolve', () => {
    it('should resolve successfully', async () => {
        const did = createDid();
        const document = await did.resolve('did:ipid:foo');

        expect(mockIpid.resolve).toHaveBeenCalledTimes(1);
        expect(mockIpid.resolve).toHaveBeenCalledWith('did:ipid:foo');
        expect(document).toEqual(mockDocument);
    });

    it('should fail if invalid did', async () => {
        expect.assertions(2);

        const did = createDid();

        try {
            await did.resolve('did#abcdef');
        } catch (err) {
            expect(err.message).toBe('Invalid DID: did#abcdef');
            expect(err.code).toBe('INVALID_DID');
        }
    });

    it('should fail if method is not supported', async () => {
        expect.assertions(2);

        const did = createDid();

        try {
            await did.resolve('did:fake:abcdef');
        } catch (err) {
            expect(err.message).toBe('Did method `fake` is not supported');
            expect(err.code).toBe('UNSUPPORTED_DID_METHOD');
        }
    });

    it('should fail if method does not support purpose', async () => {
        const mockIpidOnce = { ...mockIpid, resolve: undefined };

        createIpid.mockImplementationOnce(jest.fn(() => mockIpidOnce));

        expect.assertions(2);

        const did = createDid();

        try {
            await did.resolve('did:ipid:abcdef');
        } catch (err) {
            expect(err.message).toBe('Purpose `resolve` is not currently supported for `ipid`');
            expect(err.code).toBe('UNSUPPORTED_DID_METHOD_PURPOSE');
        }
    });
});

describe('create', () => {
    it('should create successfully', async () => {
        const mockParams = { privateKey: 'mockPrivateKey', foo: 'bar' };
        const mockOperations = jest.fn();

        const did = createDid();
        const document = await did.create('ipid', mockParams, mockOperations);

        expect(mockIpid.create).toHaveBeenCalledTimes(1);
        expect(mockIpid.create).toHaveBeenCalledWith(mockParams, mockOperations);
        expect(document).toEqual(mockDocument);
    });

    it('should fail if method is not supported', async () => {
        expect.assertions(2);

        const did = createDid();

        try {
            await did.create('fake');
        } catch (err) {
            expect(err.message).toBe('Did method `fake` is not supported');
            expect(err.code).toBe('UNSUPPORTED_DID_METHOD');
        }
    });

    it('should fail if method does not support purpose', async () => {
        const mockIpidOnce = { ...mockIpid, create: undefined };

        createIpid.mockImplementationOnce(jest.fn(() => mockIpidOnce));

        expect.assertions(2);

        const did = createDid();

        try {
            await did.create('ipid');
        } catch (err) {
            expect(err.message).toBe('Purpose `create` is not currently supported for `ipid`');
            expect(err.code).toBe('UNSUPPORTED_DID_METHOD_PURPOSE');
        }
    });
});

describe('update', () => {
    it('should create successfully', async () => {
        const mockParams = { privateKey: 'mockPrivateKey', foo: 'bar' };
        const mockOperations = jest.fn();

        const did = createDid();
        const document = await did.update('did:ipid:abcdef', mockParams, mockOperations);

        expect(mockIpid.update).toHaveBeenCalledTimes(1);
        expect(mockIpid.update).toHaveBeenCalledWith('did:ipid:abcdef', mockParams, mockOperations);
        expect(document).toEqual(mockDocument);
    });

    it('should fail if invalid did', async () => {
        expect.assertions(2);

        const did = createDid();

        try {
            await did.update('did#abcdef');
        } catch (err) {
            expect(err.message).toBe('Invalid DID: did#abcdef');
            expect(err.code).toBe('INVALID_DID');
        }
    });

    it('should fail if method is not supported', async () => {
        expect.assertions(2);

        const did = createDid();

        try {
            await did.update('did:fake:abcdef');
        } catch (err) {
            expect(err.message).toBe('Did method `fake` is not supported');
            expect(err.code).toBe('UNSUPPORTED_DID_METHOD');
        }
    });

    it('should fail if method does not support purpose', async () => {
        const mockIpidOnce = { ...mockIpid, update: undefined };

        createIpid.mockImplementationOnce(jest.fn(() => mockIpidOnce));

        expect.assertions(2);

        const did = createDid();

        try {
            await did.update('did:ipid:abcdef');
        } catch (err) {
            expect(err.message).toBe('Purpose `update` is not currently supported for `ipid`');
            expect(err.code).toBe('UNSUPPORTED_DID_METHOD_PURPOSE');
        }
    });
});

describe('isPublicKeyValid', () => {
    it('should be successful if public key in document', async () => {
        const mockOptions = { foo: 'bar' };

        const did = createDid();
        const isValid = await did.isPublicKeyValid('did:ipid:abcdef', 'did:ipid:abcdef#123', mockOptions);

        expect(isValid).toBe(true);
        expect(mockIpid.isPublicKeyValid).toHaveBeenCalledTimes(1);
        expect(mockIpid.isPublicKeyValid).toHaveBeenCalledWith('did:ipid:abcdef', 'did:ipid:abcdef#123', mockOptions);
    });

    it('should fail if invalid did', async () => {
        expect.assertions(2);

        const did = createDid();

        try {
            await did.isPublicKeyValid('did#abcdef');
        } catch (err) {
            expect(err.message).toBe('Invalid DID: did#abcdef');
            expect(err.code).toBe('INVALID_DID');
        }
    });

    it('should fail if method is not supported', async () => {
        expect.assertions(2);

        const did = createDid();

        try {
            await did.isPublicKeyValid('did:fake:abcdef');
        } catch (err) {
            expect(err.message).toBe('Did method `fake` is not supported');
            expect(err.code).toBe('UNSUPPORTED_DID_METHOD');
        }
    });

    it('should fail if method does not support purpose', async () => {
        const mockIpidOnce = { ...mockIpid, isPublicKeyValid: undefined };

        createIpid.mockImplementationOnce(jest.fn(() => mockIpidOnce));

        expect.assertions(2);

        const did = createDid();

        try {
            await did.isPublicKeyValid('did:ipid:abcdef');
        } catch (err) {
            expect(err.message).toBe('Purpose `isPublicKeyValid` is not currently supported for `ipid`');
            expect(err.code).toBe('UNSUPPORTED_DID_METHOD_PURPOSE');
        }
    });
});
