import signal from 'pico-signals';

const STORAGE_MAXTIME_KEY = 'locker.idle.maxTime';
const DEFAULT_MAX_TIME = 3 * 60 * 1000;

class IdleTimer {
    #storage;

    #maxTime;
    #timeout;
    #timeoutTime;
    #restartTimestamp = 0;

    #onTimeout = signal();

    constructor(storage, maxTime) {
        this.#storage = storage;
        this.#maxTime = maxTime;
    }

    #handleTimeout = () => {
        this.#timeout = undefined;
        this.#timeoutTime = 0;
        this.#restartTimestamp = 0;

        this.#onTimeout.dispatch();
    };

    restart() {
        clearTimeout(this.#timeout);

        this.#timeoutTime = this.#maxTime;
        this.#timeout = setTimeout(this.#handleTimeout, this.#timeoutTime);
        this.#restartTimestamp = Date.now();
    }

    getMaxTime() {
        return this.#maxTime;
    }

    getRemainingTime() {
        const remainingTime = this.#timeoutTime - (Date.now() - this.#restartTimestamp);

        return remainingTime > 0 ? remainingTime : 0;
    }

    async setMaxTime(time) {
        const isSmaller = time < this.#maxTime;

        await this.#storage.set(STORAGE_MAXTIME_KEY, time);

        this.#maxTime = time;

        if (this.#timeout && isSmaller) {
            this.restart();
        }
    }

    onTimeout(fn) {
        return this.#onTimeout.add(fn);
    }
}

const createIdleTimer = async (storage) => {
    const storageMaxTime = await storage.get(STORAGE_MAXTIME_KEY);
    const maxTime = storageMaxTime ? storageMaxTime : DEFAULT_MAX_TIME;

    return new IdleTimer(storage, maxTime);
};

export default createIdleTimer;
