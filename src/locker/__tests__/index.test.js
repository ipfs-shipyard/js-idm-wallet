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

const mockLocks = {
    passphrase: {
        isMaster: jest.fn(() => true),
        isEnabled: jest.fn(() => true),
        onEnabledChange: jest.fn(),
    },
};

const mockLocksPristine = {
    passphrase: {
        isMaster: jest.fn(() => true),
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
        createLocks.mockImplementationOnce(() => mockLocksPristine);

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

        expect(typeof locker.isPristine).toBe('function');
        expect(typeof locker.isLocked).toBe('function');
        expect(typeof locker.getSecret).toBe('function');
        expect(typeof locker.getLock).toBe('function');
        expect(typeof locker.lock).toBe('function');
        expect(typeof locker.onLockedChange).toBe('function');

        expect(typeof locker.idleTimer).toBe('object');
        expect(typeof locker.masterLock).toBe('object');
    });

    it('should create locker successfully if not pristine', async () => {
        const locker = await createLocker(mockStorage, 'passphrase');

        expect(createSecret).toHaveBeenCalledTimes(1);
        expect(createSecret).toHaveBeenCalledWith(new LockerLockedError());

        expect(createLocks).toHaveBeenCalledTimes(1);
        expect(createLocks).toHaveBeenCalledWith(mockStorage, mockSecret, 'passphrase');

        expect(createIdleTimer).toHaveBeenCalledTimes(1);
        expect(createIdleTimer).toHaveBeenCalledWith(mockStorage);

        expect(mockIdleTimer.onTimeout).toBeCalledTimes(1);

        expect(mockIdleTimer.restart).toHaveBeenCalledTimes(1);
        expect(mockSecret.generate).toHaveBeenCalledTimes(0);

        expect(mockSecret.onDefinedChange).toHaveBeenCalledTimes(1);

        expect(typeof locker.isPristine).toBe('function');
        expect(typeof locker.isLocked).toBe('function');
        expect(typeof locker.getSecret).toBe('function');
        expect(typeof locker.getLock).toBe('function');
        expect(typeof locker.lock).toBe('function');
        expect(typeof locker.onLockedChange).toBe('function');

        expect(typeof locker.idleTimer).toBe('object');
        expect(typeof locker.masterLock).toBe('object');
    });

    it('should throw if lock is unknown', async () => {
        await expect(createLocker(mockStorage, 'foobar')).rejects.toThrow('There\'s no lock of type `foobar`');
    });
});

describe('idleTimer', () => {
    it('should return idle timer', async () => {
        const locker = await createLocker(mockStorage, 'passphrase');

        expect(locker.idleTimer).toBe(mockIdleTimer);
    });
});

describe('masterLock', () => {
    it('should return master lock', async () => {
        const mockLock = {
            isMaster: () => true,
            isEnabled: () => false,
            onEnabledChange: () => {},
        };

        createLocks.mockImplementationOnce(() => ({
            foo: mockLock,
            ...mockLocks,
        }));

        const locker = await createLocker(mockStorage, 'foo');

        expect(locker.masterLock).toBe(mockLock);
    });
});

describe('isPristine', () => {
    it('should return true', async () => {
        createLocks.mockImplementationOnce(() => mockLocksPristine);

        const locker = await createLocker(mockStorage, 'passphrase');

        expect(locker.isPristine()).toBe(true);
    });

    it('should return false', async () => {
        const locker = await createLocker(mockStorage, 'passphrase');

        expect(locker.isPristine()).toBe(false);
    });
});

describe('isLocked', () => {
    it('should return true', async () => {
        const locker = await createLocker(mockStorage, 'passphrase');

        expect(locker.isLocked()).toBe(true);
    });

    it('should return false', async () => {
        mockSecret.has.mockImplementationOnce(() => true);

        const locker = await createLocker(mockStorage, 'passphrase');

        expect(locker.isLocked()).toBe(false);
    });
});

describe('getSecret', () => {
    it('should return secret', async () => {
        const locker = await createLocker(mockStorage, 'passphrase');

        expect(locker.getSecret()).toBe('a1b2c3');
        expect(mockSecret.get).toHaveBeenCalledTimes(1);
    });
});

describe('getLock', () => {
    it('should return lock successfully', async () => {
        const locker = await createLocker(mockStorage, 'passphrase');

        expect(locker.getLock('passphrase')).toBe(mockLocks.passphrase);
    });

    it('should throw if lock is unknown', async () => {
        const locker = await createLocker(mockStorage, 'passphrase');

        expect(() => locker.getLock('foobar')).toThrow('There\'s no lock of type `foobar`');
    });
});

describe('lock', () => {
    it('should unset secret', async () => {
        const locker = await createLocker(mockStorage, 'passphrase');

        locker.lock();

        expect(mockSecret.unset).toHaveBeenCalledTimes(1);
    });

    it('should fail if pristine', async () => {
        createLocks.mockImplementationOnce(() => mockLocksPristine);

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

        mockSecret.has.mockImplementationOnce(() => true);

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
        createLocks.mockImplementationOnce(() => mockLocksPristine);

        const locker = await createLocker(mockStorage, 'passphrase');
        const lockerHandleIdleTimerTimeout = mockIdleTimer.onTimeout.mock.calls[0][0];

        locker.lock = jest.fn();
        lockerHandleIdleTimerTimeout();

        expect(locker.lock).toHaveBeenCalledTimes(0);
    });

    it('should handle idle timer timeout if not pristine', async () => {
        const locker = await createLocker(mockStorage, 'passphrase');
        const lockerHandleIdleTimerTimeout = mockIdleTimer.onTimeout.mock.calls[0][0];

        locker.lock = jest.fn();

        lockerHandleIdleTimerTimeout();

        expect(locker.lock).toHaveBeenCalledTimes(1);
    });
});

describe('handleMasterLockEnabledChange', () => {
    it('should handle master lock enable change', async () => {
        const locker = await createLocker(mockStorage, 'passphrase');
        const lock = locker.getLock('passphrase');

        const lockerhandleMasterLockEnabledChange = lock.onEnabledChange.mock.calls[0][0];

        lockerhandleMasterLockEnabledChange(false);
        expect(locker.isPristine()).toBe(true);
        expect(mockIdleTimer.restart).toBeCalledTimes(1);

        lockerhandleMasterLockEnabledChange(true);
        expect(locker.isPristine()).toBe(false);
        expect(mockIdleTimer.restart).toBeCalledTimes(2);
    });
});

