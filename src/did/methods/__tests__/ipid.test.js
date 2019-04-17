import { mockDocument, mockDidIpid } from './mocks';
import createDidIpid from 'did-ipid';
import createIpid from '../ipid';

jest.mock('did-ipid', () => jest.fn((ipfs) => ({
    ipfs,
    resolve: mockDidIpid.resolve,
    create: mockDidIpid.create,
    update: mockDidIpid.update,
})));

beforeEach(() => {
    jest.clearAllMocks();
});

it('should have all supported methods', async () => {
    const ipid = createIpid();

    expect(typeof ipid.resolve).toEqual('function');
    expect(typeof ipid.create).toEqual('function');
    expect(typeof ipid.update).toEqual('function');
    expect(typeof ipid.isPublicKeyValid).toEqual('function');
    expect(ipid.constructor.info).toEqual({
        method: 'ipid',
        description: 'The Interplanetary Identifiers DID method (IPID) supports DIDs on the public and private Interplanetary File System (IPFS) networks.',
        homepageUrl: 'https://did-ipid.github.io/ipid-did-method/',
        icons: [],
    });
});

describe('resolve', () => {
    it('should resolve successfully', async () => {
        const mockIpfs = { foo: 'bar' };
        const ipid = createIpid(mockIpfs);

        await ipid.resolve('did:ipid:foo');

        expect(createDidIpid).toHaveBeenCalledWith(mockIpfs);
        expect(mockDidIpid.resolve).toHaveBeenCalledWith('did:ipid:foo');
    });

    it('should fail if did ipid resolve is unsuccessful', async () => {
        const ipid = createIpid();

        mockDidIpid.resolve.mockImplementationOnce(() => { throw new Error('bar'); });

        expect(ipid.resolve('did:ipid:foo')).rejects.toThrow('bar');
    });
});

describe('create', () => {
    it('should create successfully', async () => {
        const mockOperations = jest.fn();
        const mockParams = { privateKey: 'fakePrivateKey', foo: 'bar' };

        const ipid = createIpid();
        const document = await ipid.create(mockParams, mockOperations);

        expect(mockDidIpid.create).toHaveBeenCalledWith(mockParams.privateKey, mockOperations);
        expect(mockOperations).toHaveBeenCalledTimes(1);
        expect(document).toEqual(mockDocument);
    });

    it('should fail if did-ipid create is unsuccessful', async () => {
        expect.assertions(2);

        mockDidIpid.create.mockImplementationOnce(() => { throw new Error('bar'); });

        const mockOperations = jest.fn();
        const mockParams = { privateKey: 'fakePrivateKey', foo: 'bar' };

        const ipid = createIpid();

        try {
            await ipid.create(mockParams, mockOperations);
        } catch (err) {
            expect(mockDidIpid.create).toHaveBeenCalledWith(mockParams.privateKey, mockOperations);
            expect(err.message).toEqual('bar');
        }
    });
});

describe('update', () => {
    it('should update successfully', async () => {
        const mockOperations = jest.fn();
        const mockParams = { privateKey: 'fakePrivateKey', foo: 'bar' };
        const mockDid = 'did:ipid:foo';

        const ipid = createIpid();
        const document = await ipid.update(mockDid, mockParams, mockOperations);

        expect(mockDidIpid.update).toHaveBeenCalledWith(mockParams.privateKey, mockOperations);
        expect(mockOperations).toHaveBeenCalledTimes(1);
        expect(document).toEqual(mockDocument);
    });

    it('should fail if did-ipid update is unsuccessful', async () => {
        expect.assertions(2);

        mockDidIpid.update.mockImplementationOnce(() => { throw new Error('bar'); });

        const mockOperations = jest.fn();
        const mockParams = { privateKey: 'fakePrivateKey', foo: 'bar' };
        const mockDid = 'did:ipid:foo';

        const ipid = createIpid();

        try {
            await ipid.update(mockDid, mockParams, mockOperations);
        } catch (err) {
            expect(mockDidIpid.update).toHaveBeenCalledWith(mockParams.privateKey, mockOperations);
            expect(err.message).toEqual('bar');
        }
    });
});

describe('isPublicKeyValid', () => {
    it('should be successful if public key available in the document', async () => {
        mockDidIpid.resolve.mockImplementationOnce(() => ({ ...mockDocument, publicKey: [{ id: 'bar' }] }));

        const ipid = createIpid();
        const isValid = await ipid.isPublicKeyValid('did:ipid:foo', 'bar');

        expect(isValid).toBeTruthy();
        expect(mockDidIpid.resolve).toHaveBeenCalledWith('did:ipid:foo');
    });

    it('should fail if public key no available in the document', async () => {
        mockDidIpid.resolve.mockImplementationOnce(() => ({ ...mockDocument }));

        const ipid = createIpid();
        const isValid = await ipid.isPublicKeyValid('did:ipid:foo', 'bar');

        expect(isValid).toBeFalsy();
        expect(mockDidIpid.resolve).toHaveBeenCalledWith('did:ipid:foo');
    });

    it('should fail if resolve is unsuccessful', async () => {
        mockDidIpid.resolve.mockImplementationOnce(() => { throw new Error('bar'); });

        const ipid = createIpid();

        expect(ipid.isPublicKeyValid('did:ipid:foo', 'bar')).rejects.toThrow('bar');
    });
});

it('should use the same did-ipid instance for multiple purposes', async () => {
    const ipid = createIpid({});

    await ipid.resolve('did:ipid:foo');
    await ipid.create({}, jest.fn());
    await ipid.update('did:ipid:foo', {}, jest.fn());

    expect(mockDidIpid.resolve).toHaveBeenCalledTimes(1);
    expect(mockDidIpid.create).toHaveBeenCalledTimes(1);
    expect(mockDidIpid.update).toHaveBeenCalledTimes(1);
});
