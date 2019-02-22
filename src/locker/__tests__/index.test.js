import createLocker from '../index';
import createSecret from '../secret';
import createIdleTimer from '../idle-timer';
import createLock, { isEnabled as isLockEnabled } from '../locks';

const mockStorage = {};

const mockSecret = {
    has: jest.fn(() => false),
    get: jest.fn(() => 'a1b2c3'),
    unset: jest.fn(),
    onDefinedChange: jest.fn(),
};

const mockIdleTimer = {
    onTimeout: jest.fn(),
    restart: jest.fn(),
};

const mockLock = {
    onEnabledChange: jest.fn(),
};

jest.mock('../idle-timer', () => jest.fn(() => mockIdleTimer));
jest.mock('../secret', () => jest.fn(() => mockSecret));
jest.mock('../locks', () => ({
    __esModule: true,
    default: jest.fn(() => mockLock),
    isEnabled: jest.fn(() => false),
}));

beforeEach(() => {
    jest.clearAllMocks();
});

describe('factory', () => {
    it('should create locker successfully if pristine', async () => {
        const locker = await createLocker(mockStorage, 'passphrase');

        expect(isLockEnabled).toHaveBeenCalledTimes(1);
        expect(isLockEnabled).toHaveBeenCalledWith('passphrase', { storage: mockStorage });

        expect(createIdleTimer).toHaveBeenCalledTimes(1);
        expect(createIdleTimer).toHaveBeenCalledWith(mockStorage);
        expect(mockIdleTimer.onTimeout).toBeCalledTimes(1);

        expect(createSecret).toHaveBeenCalledTimes(1);
        expect(createSecret).toHaveBeenCalledWith(Object.assign(new Error('Locker is locked'), { code: 'LOCKED' }), true);
        expect(mockSecret.onDefinedChange).toHaveBeenCalledTimes(1);

        expect(mockIdleTimer.restart).toHaveBeenCalledTimes(0);

        expect(typeof locker.isPristine).toEqual('function');
        expect(typeof locker.isLocked).toEqual('function');
        expect(typeof locker.getSecret).toEqual('function');
        expect(typeof locker.getIdleTimer).toEqual('function');
        expect(typeof locker.getMasterLock).toEqual('function');
        expect(typeof locker.getLock).toEqual('function');
        expect(typeof locker.lock).toEqual('function');
        expect(typeof locker.onLockedChange).toEqual('function');
    });

    it('should create locker successfully if not pristine', async () => {
        isLockEnabled.mockImplementationOnce(jest.fn(() => true));

        const locker = await createLocker(mockStorage, 'fingerprint');

        expect(isLockEnabled).toHaveBeenCalledTimes(1);
        expect(isLockEnabled).toHaveBeenCalledWith('fingerprint', { storage: mockStorage });

        expect(createIdleTimer).toHaveBeenCalledTimes(1);
        expect(createIdleTimer).toHaveBeenCalledWith(mockStorage);
        expect(mockIdleTimer.onTimeout).toBeCalledTimes(1);

        expect(createSecret).toHaveBeenCalledTimes(1);
        expect(createSecret).toHaveBeenCalledWith(Object.assign(new Error('Locker is locked'), { code: 'LOCKED' }), false);
        expect(mockSecret.onDefinedChange).toHaveBeenCalledTimes(1);

        expect(mockIdleTimer.restart).toHaveBeenCalledTimes(1);

        expect(typeof locker.isPristine).toEqual('function');
        expect(typeof locker.isLocked).toEqual('function');
        expect(typeof locker.getSecret).toEqual('function');
        expect(typeof locker.getIdleTimer).toEqual('function');
        expect(typeof locker.getMasterLock).toEqual('function');
        expect(typeof locker.getLock).toEqual('function');
        expect(typeof locker.lock).toEqual('function');
        expect(typeof locker.onLockedChange).toEqual('function');
    });
});

describe('isPristine', () => {
    it('should return true', async () => {
        const locker = await createLocker(mockStorage, 'passphrase');

        expect(locker.isPristine()).toBeTruthy();
    });

    it('should return false', async () => {
        isLockEnabled.mockImplementationOnce(jest.fn(() => true));

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

describe('getIdleTimer', () => {
    it('should return idle timer', async () => {
        const locker = await createLocker(mockStorage, 'passphrase');

        expect(locker.getIdleTimer()).toEqual(mockIdleTimer);
    });
});

describe('getLock', () => {
    it('should create lock if not available and add listener if master', async () => {
        const locker = await createLocker(mockStorage, 'passphrase');

        locker.getLock('passphrase');

        expect(createLock).toHaveBeenCalledTimes(1);
        expect(createLock).toHaveBeenCalledWith('passphrase', { storage: mockStorage, secret: mockSecret, master: true });

        expect(mockLock.onEnabledChange).toHaveBeenCalledTimes(1);
    });

    it('should create lock if not available and don\'t add listener if not master', async () => {
        const locker = await createLocker(mockStorage, 'passphrase');

        locker.getLock('fingerprint');

        expect(createLock).toHaveBeenCalledTimes(1);
        expect(createLock).toHaveBeenCalledWith('fingerprint', { storage: mockStorage, secret: mockSecret, master: false });

        expect(mockLock.onEnabledChange).toHaveBeenCalledTimes(0);
    });

    it('should not create lock if available', async () => {
        const locker = await createLocker(mockStorage, 'passphrase');
        const lock1 = locker.getLock('passphrase');

        jest.clearAllMocks();

        const lock2 = locker.getLock('passphrase');

        expect(createLock).toHaveBeenCalledTimes(0);
        expect(mockLock.onEnabledChange).toHaveBeenCalledTimes(0);
        expect(lock1).toEqual(lock2);
    });
});

describe('getMasterLock', () => {
    it('should return master lock', async () => {
        const locker = await createLocker(mockStorage, 'passphrase');

        locker.getLock = jest.fn();
        locker.getMasterLock();

        expect(locker.getLock).toHaveBeenCalledTimes(1);
        expect(locker.getLock).toHaveBeenCalledWith('passphrase');
    });
});

describe('lock', () => {
    it('should return master lock', async () => {
        isLockEnabled.mockImplementationOnce(jest.fn(() => true));

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
        isLockEnabled.mockImplementationOnce(jest.fn(() => true));

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
        expect(locker.isPristine()).toBeTruthy();
        expect(mockIdleTimer.restart).toBeCalledTimes(0);

        lockerhandleMasterLockEnabledChange(true);
        expect(locker.isPristine()).toBeFalsy();
        expect(mockIdleTimer.restart).toBeCalledTimes(1);
    });
});

