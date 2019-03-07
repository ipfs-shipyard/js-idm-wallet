import createWallet from '../index';
import createStorage from '../storage';
import createLocker from '../locker';

jest.mock('../storage', () => jest.fn());
jest.mock('../locker', () => jest.fn());

it('should create wallet successfully', async () => {
    const wallet = await createWallet();

    expect(Object.keys(wallet)).toEqual(['storage', 'locker']);
});

it('should throw if storage creation fails', async () => {
    createStorage.mockImplementationOnce(() => { throw new Error('foo'); });

    expect(createWallet()).rejects.toThrow('foo');
});

it('should throw if locker creation fails', async () => {
    createLocker.mockImplementationOnce(() => { throw new Error('bar'); });

    expect(createWallet()).rejects.toThrow('bar');
});
