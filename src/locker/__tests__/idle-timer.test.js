import createIdleTimer from '../idle-timer';

jest.useFakeTimers();

const mockDate = (nowIncrement = 1000) => {
    let nowTotalCalls = 0;

    class Date {
        static now() {
            nowTotalCalls += 1;

            return nowTotalCalls * nowIncrement;
        }
    }

    Object.defineProperty(global, 'Date', { value: Date, writable: true });
};

const mockStorage = {
    get: jest.fn(() => 5000),
    set: jest.fn(),
};

beforeEach(() => {
    jest.clearAllMocks();
});

it('should have all specification methods', async () => {
    const idleTimer = await createIdleTimer(mockStorage);

    expect(typeof idleTimer.setMaxTime).toBe('function');
    expect(typeof idleTimer.getMaxTime).toBe('function');
    expect(typeof idleTimer.getRemainingTime).toBe('function');
    expect(typeof idleTimer.restart).toBe('function');
});

describe('factory', () => {
    it('should create idle-timer with default max time', async () => {
        const idleTimer = await createIdleTimer({ get: () => null });

        expect(idleTimer.getMaxTime()).toBe(180000);
    });

    it('should create idle-timer with storage max time', async () => {
        const idleTimer = await createIdleTimer(mockStorage);

        expect(idleTimer.getMaxTime()).toBe(5000);
    });
});

describe('getMaxTime & setMaxTime', () => {
    it('should set max time correctly', async () => {
        const idleTimer = await createIdleTimer(mockStorage);

        await idleTimer.setMaxTime(10000);

        expect(mockStorage.set).toHaveBeenCalledWith('locker.idle.maxTime', 10000);
        expect(idleTimer.getMaxTime()).toBe(10000);
    });

    it('should set max time correctly and restart timeout if time is smaller', async () => {
        const idleTimer = await createIdleTimer(mockStorage);

        idleTimer.restart();
        idleTimer.restart = jest.fn();

        await idleTimer.setMaxTime(1000);

        expect(mockStorage.set).toHaveBeenCalledWith('locker.idle.maxTime', 1000);
        expect(idleTimer.getMaxTime()).toBe(1000);
        expect(idleTimer.restart).toHaveBeenCalledTimes(1);
    });
});

describe('getRemainingTime', () => {
    it('should get remaining time until timeout', async () => {
        const idleTimer = await createIdleTimer(mockStorage);

        mockDate();
        idleTimer.restart();

        expect(idleTimer.getRemainingTime()).toBe(4000);
    });

    it('should get remaining time has 0 if timeout already occured', async () => {
        const idleTimer = await createIdleTimer(mockStorage);

        mockDate(10000);
        idleTimer.restart();

        expect(idleTimer.getRemainingTime()).toBe(0);
    });
});

describe('onTimeout', () => {
    it('should add callback to be called on timeout', async () => {
        const idleTimer = await createIdleTimer(mockStorage);
        const onTimeoutMethod = jest.fn();

        idleTimer.onTimeout(onTimeoutMethod);
        idleTimer.restart();

        jest.runAllTimers();

        expect(onTimeoutMethod).toHaveBeenCalledTimes(1);
    });

    it('should add callback and return remove method', async () => {
        const idleTimer = await createIdleTimer(mockStorage);
        const onTimeoutMethod = jest.fn();

        const remove = idleTimer.onTimeout(onTimeoutMethod);

        remove();
        idleTimer.restart();
        jest.runAllTimers();

        expect(onTimeoutMethod).toHaveBeenCalledTimes(0);
    });
});
