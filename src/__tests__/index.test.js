import Ipfs from 'ipfs';
import createWallet from '../index';
import createStorage from '../storage';
import createLocker from '../locker';
import createDid from '../did';
import { mockIpfs } from './mocks';

jest.mock('ipfs', () => jest.fn((...args) => new mockIpfs(...args))); // eslint-disable-line babel/new-cap
jest.mock('../storage');
jest.mock('../locker');
jest.mock('../did');

beforeEach(() => {
    jest.clearAllMocks();
});

it('should create wallet successfully', async () => {
    const wallet = await createWallet();

    expect(Object.keys(wallet)).toEqual(['storage', 'locker', 'did']);
    expect(Ipfs).toHaveBeenCalledTimes(1);
    expect(Ipfs).toHaveBeenCalledWith({ pass: 'K52XQ7K0FPR1DF01RM0L' });
});

it('should throw if storage creation fails', async () => {
    createStorage.mockImplementationOnce(() => { throw new Error('foo'); });

    expect(createWallet()).rejects.toThrow('foo');
});

it('should throw if locker creation fails', async () => {
    createLocker.mockImplementationOnce(() => { throw new Error('bar'); });

    expect(createWallet()).rejects.toThrow('bar');
});

it('should throw if did creation fails', async () => {
    createDid.mockImplementationOnce(() => { throw new Error('biz'); });

    expect(createWallet()).rejects.toThrow('biz');
});

it('should throw if ipfs node creation fails', async () => {
    expect.assertions(2);

    Ipfs.mockImplementationOnce(jest.fn(() => ({
        on: (state, callback) => { state === 'error' && callback('foobar'); },
    })));

    try {
        await createWallet();
    } catch (err) {
        expect(err).toEqual('foobar');
    }
});

it('should use a ipfs node provided in options', async () => {
    const mockIpfsNode = { isOnline: jest.fn(() => true) };

    await createWallet({ ipfs: mockIpfsNode });

    expect(createDid).toHaveBeenCalledWith(mockIpfsNode);
});

it('should fail if provided ipfs node is not online', async () => {
    expect.assertions(2);

    const mockIpfsNode = { isOnline: jest.fn(() => false) };

    try {
        await createWallet({ ipfs: mockIpfsNode });
    } catch (err) {
        expect(err.message).toEqual('IPFS node is unavailable.');
        expect(err.code).toEqual('IPFS_UNAVAILABLE');
    }
});

