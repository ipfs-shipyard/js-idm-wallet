import Ipfs from 'ipfs';
import createWallet from '../index';
import createStorage from '../storage';
import createLocker from '../locker';
import createDidm from '../didm';
import { mockIpfs } from './mocks';

jest.mock('ipfs', () => jest.fn((...args) => new mockIpfs(...args))); // eslint-disable-line babel/new-cap
jest.mock('../storage');
jest.mock('../locker');
jest.mock('../didm');

beforeEach(() => {
    jest.clearAllMocks();
});

it('should create wallet successfully', async () => {
    const wallet = await createWallet();

    expect(Object.keys(wallet)).toEqual(['didm', 'storage', 'locker', 'identities']);
    expect(Ipfs).toHaveBeenCalledTimes(1);
    expect(Ipfs).toHaveBeenCalledWith({ pass: 'K52XQ7K0FPR1DF01RM0L' });
});

it('should throw if storage creation fails', async () => {
    createStorage.mockImplementationOnce(() => { throw new Error('foo'); });

    await expect(createWallet()).rejects.toThrow('foo');
});

it('should throw if locker creation fails', async () => {
    createLocker.mockImplementationOnce(() => { throw new Error('bar'); });

    await expect(createWallet()).rejects.toThrow('bar');
});

it('should throw if didm creation fails', async () => {
    createDidm.mockImplementationOnce(() => { throw new Error('biz'); });

    await expect(createWallet()).rejects.toThrow('biz');
});

it('should throw if ipfs node creation fails', async () => {
    expect.assertions(1);

    Ipfs.mockImplementationOnce(() => ({
        on: (state, callback) => { state === 'error' && callback('foobar'); },
    }));

    try {
        await createWallet();
    } catch (err) {
        expect(err).toBe('foobar');
    }
});

it('should use a ipfs node provided in options', async () => {
    const mockIpfsNode = { isOnline: () => true };

    await createWallet({ ipfs: mockIpfsNode });

    expect(createDidm).toHaveBeenCalledWith(mockIpfsNode);
});

it('should fail if provided ipfs node is not online', async () => {
    expect.assertions(2);

    const mockIpfsNode = { isOnline: () => false };

    try {
        await createWallet({ ipfs: mockIpfsNode });
    } catch (err) {
        expect(err.message).toBe('IPFS node is unavailable.');
        expect(err.code).toBe('IPFS_UNAVAILABLE');
    }
});

