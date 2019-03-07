import signal from 'pico-signals';
import createLock, { isEnabled as isLockEnabled } from './locks';
import createIdleTimer from './idle-timer';
import createSecret from './secret';

class Locker {
    #storage;
    #idleTimer;
    #pristine;
    #masterLockType;

    #secret;
    #locks = new Map();
    #onLocked = signal();

    constructor({ storage, pristine, masterLockType, idleTimer }) {
        this.#storage = storage;
        this.#pristine = pristine;
        this.#masterLockType = masterLockType;

        this.#idleTimer = idleTimer;
        this.#idleTimer.onTimeout(this.#handleIdleTimerTimeout);

        this.#secret = createSecret(Object.assign(new Error('Locker is locked'), { code: 'LOCKED' }), pristine);
        this.#secret.onDefinedChange(this.#handleSecretDefinedChange);

        if (!this.#pristine) {
            this.#idleTimer.restart();
        }
    }

    isPristine() {
        return this.#pristine;
    }

    isLocked() {
        return !this.#secret.has();
    }

    getSecret() {
        return this.#secret.get();
    }

    getIdleTimer() {
        return this.#idleTimer;
    }

    getMasterLock() {
        return this.getLock(this.#masterLockType);
    }

    getLock(type) {
        if (!this.#locks.has(type)) {
            const master = this.#masterLockType === type;
            const lock = createLock(type, {
                storage: this.#storage,
                secret: this.#secret,
                master,
            });

            if (master) {
                lock.onEnabledChange(this.#handleMasterLockEnabledChange);
            }

            this.#locks.set(type, lock);
        }

        return this.#locks.get(type);
    }

    lock() {
        if (this.#pristine) {
            throw Object.assign(new Error('Can\'t lock until you configure the master lock'), { code: 'IS_PRISTINE' });
        }

        this.#secret.unset();
    }

    onLockedChange(fn) {
        return this.#onLocked.add(fn);
    }

    #handleIdleTimerTimeout = () => {
        if (!this.#pristine) {
            this.lock();
        }
    }

    #handleSecretDefinedChange = () => {
        const locked = this.isLocked();

        if (!locked) {
            this.#idleTimer.restart();
        }

        this.#onLocked.dispatch(locked);
    }

    #handleMasterLockEnabledChange = (enabled) => {
        this.#pristine = !enabled;

        if (enabled) {
            this.#idleTimer.restart();
        }
    }
}

const createLocker = async (storage, masterLockType = 'passphrase') => {
    const pristine = !await isLockEnabled(masterLockType, { storage });
    const idleTimer = await createIdleTimer(storage);

    return new Locker({ storage, pristine, masterLockType, idleTimer });
};

export default createLocker;
