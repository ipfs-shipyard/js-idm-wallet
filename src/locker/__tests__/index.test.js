import createLocker from '../index';
import createSecret from '../secret';
import createLocks from '../locks';
import createIdleTimer from '../idle-timer';
import { LockerLockedError } from '../../utils/errors';

const mockStorage = {};

const mockSecret = {
    has: jest.fn(() => false),
    get: jest.fn(() => 'a1b2c3'),
    unset: jest.fn(),
    generate: jest.fn(),
    onDefinedChange: jest.fn(),
};

const mockIdleTimer = {
    onTimeout: jest.fn(),
    restart: jest.fn(),
};

const mockLock = {
    isEnabled: jest.fn(() => true),
    onEnabledChange: jest.fn(),
};

const mockLocks = {
    passphrase: {
        isEnabled: jest.fn(() => false),
        onEnabledChange: jest.fn(),
    },
};

jest.mock('../idle-timer', () => jest.fn(() => mockIdleTimer));
jest.mock('../secret', () => jest.fn(() => mockSecret));
jest.mock('../locks', () => jest.fn(() => mockLocks));

beforeEach(() => {
    jest.clearAllMocks();
});

describe('factory', () => {
    it('should create locker successfully if pristine', async () => {
        const locker = await createLocker(mockStorage);

        expect(createSecret).toHaveBeenCalledTimes(1);
        expect(createSecret).toHaveBeenCalledWith(new LockerLockedError());

        expect(createLocks).toHaveBeenCalledTimes(1);
        expect(createLocks).toHaveBeenCalledWith(mockStorage, mockSecret, 'passphrase');

        expect(createIdleTimer).toHaveBeenCalledTimes(1);
        expect(createIdleTimer).toHaveBeenCalledWith(mockStorage);

        expect(mockIdleTimer.onTimeout).toBeCalledTimes(1);

        expect(mockIdleTimer.restart).toHaveBeenCalledTimes(0);
        expect(mockSecret.generate).toHaveBeenCalledTimes(1);

        expect(mockSecret.onDefinedChange).toHaveBeenCalledTimes(1);

        expect(typeof locker.isPristine).toEqual('function');
        expect(typeof locker.isLocked).toEqual('function');
        expect(typeof locker.getSecret).toEqual('function');
        expect(typeof locker.getLock).toEqual('function');
        expect(typeof locker.lock).toEqual('function');
        expect(typeof locker.onLockedChange).toEqual('function');

        expect(typeof locker.idleTimer).toEqual('object');
        expect(typeof locker.masterLock).toEqual('object');
    });

    it('should create locker successfully if not pristine', async () => {
        createLocks.mockImplementationOnce(jest.fn(() => ({ fingerprint: mockLock })));

        const locker = await createLocker(mockStorage, 'fingerprint');

        expect(createSecret).toHaveBeenCalledTimes(1);
        expect(createSecret).toHaveBeenCalledWith(new LockerLockedError());

        expect(createLocks).toHaveBeenCalledTimes(1);
        expect(createLocks).toHaveBeenCalledWith(mockStorage, mockSecret, 'fingerprint');

        expect(createIdleTimer).toHaveBeenCalledTimes(1);
        expect(createIdleTimer).toHaveBeenCalledWith(mockStorage);

        expect(mockIdleTimer.onTimeout).toBeCalledTimes(1);

        expect(mockIdleTimer.restart).toHaveBeenCalledTimes(1);
        expect(mockSecret.generate).toHaveBeenCalledTimes(0);

        expect(mockSecret.onDefinedChange).toHaveBeenCalledTimes(1);

        expect(typeof locker.isPristine).toEqual('function');
        expect(typeof locker.isLocked).toEqual('function');
        expect(typeof locker.getSecret).toEqual('function');
        expect(typeof locker.getLock).toEqual('function');
        expect(typeof locker.lock).toEqual('function');
        expect(typeof locker.onLockedChange).toEqual('function');

        expect(typeof locker.idleTimer).toEqual('object');
        expect(typeof locker.masterLock).toEqual('object');
    });
});

describe('idleTimer', () => {
    it('should return idle timer', async () => {
        const locker = await createLocker(mockStorage, 'passphrase');

        expect(locker.idleTimer).toEqual(mockIdleTimer);
    });
});

describe('masterLock', () => {
    it('should return master lock', async () => {
        createLocks.mockImplementationOnce(jest.fn(() => ({ passphrase: mockLock })));

        const locker = await createLocker(mockStorage, 'passphrase');

        expect(locker.masterLock).toEqual(mockLock);
    });
});

describe('isPristine', () => {
    it('should return true', async () => {
        const locker = await createLocker(mockStorage, 'passphrase');

        expect(locker.isPristine()).toBeTruthy();
    });

    it('should return false', async () => {
        createLocks.mockImplementationOnce(jest.fn(() => ({ passphrase: mockLock })));

        const locker = await createLocker(mockStorage, 'passphrase');

        expect(locker.isPristine()).toBeFalsy();
    });
});

describe('isLocked', () => {
    it('should return true', async () => {
        const locker = await createLocker(mockStorage, 'passphrase');

        expect(locker.isLocked()).toBeTruthy();
    });

    it('should return false', async () => {
        mockSecret.has.mockImplementationOnce(jest.fn(() => true));

        const locker = await createLocker(mockStorage, 'passphrase');

        expect(locker.isLocked()).toBeFalsy();
    });
});

describe('getSecret', () => {
    it('should return secret', async () => {
        const locker = await createLocker(mockStorage, 'passphrase');

        expect(locker.getSecret()).toEqual('a1b2c3');
        expect(mockSecret.get).toHaveBeenCalledTimes(1);
    });
});

describe('getLock', () => {
    it('should return lock successfully', async () => {
        const mockLocks = { passphrase: mockLock };

        createLocks.mockImplementationOnce(jest.fn(() => mockLocks));

        const locker = await createLocker(mockStorage, 'passphrase');

        expect(locker.getLock('passphrase')).toEqual(mockLocks.passphrase);
    });

    it('should return undefined if lock is unavailable', async () => {
        const locker = await createLocker(mockStorage, 'foobar');

        expect(locker.getLock('foobar')).toBeUndefined();
    });
});

describe('lock', () => {
    it('should unset secret', async () => {
        createLocks.mockImplementationOnce(jest.fn(() => ({ passphrase: mockLock })));

        const locker = await createLocker(mockStorage, 'passphrase');

        locker.lock();

        expect(mockSecret.unset).toHaveBeenCalledTimes(1);
    });

    it('should fail if pristine', async () => {
        const locker = await createLocker(mockStorage, 'passphrase');

        expect(() => locker.lock()).toThrow('Can\'t lock until you configure the master lock');
        expect(mockSecret.unset).toHaveBeenCalledTimes(0);
    });
});

describe('onLockedChange', () => {
    it('should dispatch to listeners on lock change', async () => {
        const locker = await createLocker(mockStorage, 'passphrase');
        const lockerHandleSecretDefinedChange = mockSecret.onDefinedChange.mock.calls[0][0];
        const listener = jest.fn();

        const removeListener = locker.onLockedChange(listener);

        lockerHandleSecretDefinedChange();

        expect(listener).toHaveBeenCalledTimes(1);
        expect(listener).toHaveBeenCalledWith(true);

        mockSecret.has.mockImplementationOnce(jest.fn(() => true));

        lockerHandleSecretDefinedChange();

        expect(listener).toHaveBeenCalledTimes(2);
        expect(listener).toHaveBeenCalledWith(false);

        removeListener();
        lockerHandleSecretDefinedChange();

        expect(listener).toHaveBeenCalledTimes(2);
    });
});

describe('handleIdleTimerTimeout', () => {
    it('should handle idle timer timeout if pristine', async () => {
        const locker = await createLocker(mockStorage, 'passphrase');
        const lockerHandleIdleTimerTimeout = mockIdleTimer.onTimeout.mock.calls[0][0];

        locker.lock = jest.fn();
        lockerHandleIdleTimerTimeout();

        expect(locker.lock).toHaveBeenCalledTimes(0);
    });

    it('should handle idle timer timeout if not pristine', async () => {
        createLocks.mockImplementationOnce(jest.fn(() => ({ passphrase: mockLock })));

        const locker = await createLocker(mockStorage, 'passphrase');
        const lockerHandleIdleTimerTimeout = mockIdleTimer.onTimeout.mock.calls[0][0];

        locker.lock = jest.fn();

        lockerHandleIdleTimerTimeout();

        expect(locker.lock).toHaveBeenCalledTimes(1);
    });
});

describe('handleMasterLockEnabledChange', () => {
    it('should handle master lock enable change', async () => {
        createLocks.mockImplementationOnce(jest.fn(() => ({ passphrase: mockLock })));

        const locker = await createLocker(mockStorage, 'passphrase');
        const lock = locker.getLock('passphrase');

        const lockerhandleMasterLockEnabledChange = lock.onEnabledChange.mock.calls[0][0];

        lockerhandleMasterLockEnabledChange(false);
        expect(locker.isPristine()).toBeTruthy();
        expect(mockIdleTimer.restart).toBeCalledTimes(1);

        lockerhandleMasterLockEnabledChange(true);
        expect(locker.isPristine()).toBeFalsy();
        expect(mockIdleTimer.restart).toBeCalledTimes(2);
    });
});

