import { mockDid, mockDocument, mockKeyPair, mockDidIpid, mockHumanCryptoKeys, mockBackupData } from './mocks';
import createDidIpid from 'did-ipid';
import createIpid from '../ipid';

jest.mock('did-ipid', () => {
    const { getDid, ...rest } = mockDidIpid;

    return {
        __esModule: true,
        getDid,
        default: jest.fn(() => rest),
    };
});

jest.mock('human-crypto-keys', () => mockHumanCryptoKeys);

beforeEach(() => {
    jest.clearAllMocks();
});

it('should have all supported methods', async () => {
    const ipid = createIpid();

    expect(typeof ipid.getDid).toBe('function');
    expect(typeof ipid.resolve).toBe('function');
    expect(typeof ipid.create).toBe('function');
    expect(typeof ipid.update).toBe('function');
    expect(typeof ipid.isPublicKeyValid).toBe('function');
    expect(ipid.constructor.info).toEqual({
        method: 'ipid',
        description: 'The Interplanetary Identifiers DID method (IPID) supports DIDs on the public and private Interplanetary File System (IPFS) networks.',
        homepageUrl: 'https://did-ipid.github.io/ipid-did-method/',
        icons: [],
    });
});

describe('getDid', () => {
    it('should get did successfully', async () => {
        const mockParams = { privateKey: mockKeyPair.privateKey };
        const ipid = createIpid();

        const did = await ipid.getDid(mockParams);

        expect(did).toBe(mockDid);
        expect(mockDidIpid.getDid).toHaveBeenCalledWith(mockParams.privateKey);
    });

    it('should support mnemonics', async () => {
        const mockParams = { mnemonic: mockBackupData.mnemonic };
        const ipid = createIpid();

        const did = await ipid.getDid(mockParams);

        expect(did).toBe(mockDid);
        expect(mockDidIpid.getDid).toHaveBeenCalledWith(mockKeyPair.privateKey);
    });

    it('should support seeds', async () => {
        const mockParams = { seed: mockBackupData.seed };
        const ipid = createIpid();

        const did = await ipid.getDid(mockParams);

        expect(did).toBe(mockDid);
        expect(mockDidIpid.getDid).toHaveBeenCalledWith(mockKeyPair.privateKey);
    });

    it('should fail if params are missing', async () => {
        const ipid = createIpid();

        expect.assertions(2);

        try {
            await ipid.getDid({});
        } catch (err) {
            expect(err.message).toBe('Please specify the privateKey, seed or mnemonic');
            expect(err.code).toBe('MISSING_DID_PARAMETERS');
        }
    });
});

describe('resolve', () => {
    it('should resolve successfully', async () => {
        const mockIpfs = { foo: 'bar' };
        const ipid = createIpid(mockIpfs);

        const document = await ipid.resolve(mockDid);

        expect(document).toEqual(mockDocument);
        expect(createDidIpid).toHaveBeenCalledWith(mockIpfs);
        expect(mockDidIpid.resolve).toHaveBeenCalledWith(mockDid);
    });

    it('should fail if did ipid resolve is unsuccessful', async () => {
        const ipid = createIpid();

        mockDidIpid.resolve.mockImplementationOnce(() => { throw new Error('bar'); });

        await expect(ipid.resolve(mockDid)).rejects.toThrow('bar');
    });
});

describe('create', () => {
    it('should create successfully', async () => {
        const mockOperations = jest.fn();

        const ipid = createIpid();
        const { did, didDocument, backupData } = await ipid.create({}, mockOperations);

        expect(mockDidIpid.create).toHaveBeenCalledTimes(1);
        expect(mockDidIpid.create.mock.calls[0][0]).toBe(mockKeyPair.privateKey);
        expect(mockOperations).toHaveBeenCalledTimes(1);
        expect(did).toBe(mockDid);
        expect(didDocument).toEqual(mockDocument);
        expect(backupData).toEqual(backupData);
    });

    it('should fail if did-ipid create is unsuccessful', async () => {
        expect.assertions(4);

        mockDidIpid.create.mockImplementationOnce(() => { throw new Error('bar'); });

        const mockOperations = jest.fn();

        const ipid = createIpid();

        try {
            await ipid.create({}, mockOperations);
        } catch (err) {
            expect(mockDidIpid.create).toHaveBeenCalledTimes(1);
            expect(mockDidIpid.create.mock.calls[0][0]).toBe(mockKeyPair.privateKey);
            expect(mockOperations).toHaveBeenCalledTimes(0);
            expect(err.message).toBe('bar');
        }
    });
});

describe('update', () => {
    it('should update successfully', async () => {
        const mockOperations = jest.fn();
        const mockParams = { privateKey: mockKeyPair.privateKey };

        const ipid = createIpid();
        const didDocument = await ipid.update(mockDid, mockParams, mockOperations);

        expect(mockDidIpid.update).toHaveBeenCalledWith(mockParams.privateKey, mockOperations);
        expect(mockOperations).toHaveBeenCalledTimes(1);
        expect(didDocument).toEqual(mockDocument);
    });

    it('should support mnemonics', async () => {
        const mockOperations = () => {};
        const mockParams = { mnemonic: mockBackupData.mnemonic };

        const ipid = createIpid();
        const didDocument = await ipid.update(mockDid, mockParams, mockOperations);

        expect(didDocument).toBe(mockDocument);
    });

    it('should support seeds', async () => {
        const mockOperations = () => {};
        const mockParams = { seed: mockBackupData.seed };

        const ipid = createIpid();
        const didDocument = await ipid.update(mockDid, mockParams, mockOperations);

        expect(didDocument).toEqual(mockDocument);
    });

    it('should fail if did-ipid update is unsuccessful', async () => {
        expect.assertions(3);

        mockDidIpid.update.mockImplementationOnce(() => { throw new Error('bar'); });

        const mockOperations = jest.fn();
        const mockParams = { privateKey: mockKeyPair.privateKey };

        const ipid = createIpid();

        try {
            await ipid.update(mockDid, mockParams, mockOperations);
        } catch (err) {
            expect(mockDidIpid.update).toHaveBeenCalledWith(mockParams.privateKey, mockOperations);
            expect(mockOperations).toHaveBeenCalledTimes(0);
            expect(err.message).toBe('bar');
        }
    });
});

describe('isPublicKeyValid', () => {
    it('should be successful if public key available in the document', async () => {
        mockDidIpid.resolve.mockImplementationOnce(() => ({ ...mockDocument, publicKey: [{ id: 'bar' }] }));

        const ipid = createIpid();
        const isValid = await ipid.isPublicKeyValid(mockDid, 'bar');

        expect(isValid).toBe(true);
        expect(mockDidIpid.resolve).toHaveBeenCalledWith(mockDid);
    });

    it('should fail if public key no available in the document', async () => {
        mockDidIpid.resolve.mockImplementationOnce(() => ({ ...mockDocument }));

        const ipid = createIpid();
        const isValid = await ipid.isPublicKeyValid(mockDid, 'bar');

        expect(isValid).toBe(false);
        expect(mockDidIpid.resolve).toHaveBeenCalledWith(mockDid);
    });

    it('should fail if resolve is unsuccessful', async () => {
        mockDidIpid.resolve.mockImplementationOnce(() => { throw new Error('bar'); });

        const ipid = createIpid();

        await expect(ipid.isPublicKeyValid(mockDid, 'bar')).rejects.toThrow('bar');
    });
});

it('should use the same did-ipid instance for multiple purposes', async () => {
    const ipid = createIpid({});

    await ipid.resolve(mockDid);
    await ipid.create({}, () => {});
    await ipid.update(mockDid, { privateKey: mockKeyPair.privateKey }, () => {});

    expect(mockDidIpid.resolve).toHaveBeenCalledTimes(1);
    expect(mockDidIpid.create).toHaveBeenCalledTimes(1);
    expect(mockDidIpid.update).toHaveBeenCalledTimes(1);
});
