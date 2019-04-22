import signal from 'pico-signals';
import createLocks from './locks';
import createIdleTimer from './idle-timer';
import createSecret from './secret';
import { LockerLockedError, PristineError } from '../utils/errors';

class Locker {
    #locks;
    #secret;
    #storage;
    #pristine;
    #idleTimer;
    #masterLockType;

    #onLocked = signal();

    constructor({ storage, secret, locks, idleTimer, masterLockType }) {
        this.#locks = locks;
        this.#secret = secret;
        this.#storage = storage;
        this.#masterLockType = masterLockType;

        this.#pristine = !this.#locks[masterLockType] || !this.#locks[masterLockType].isEnabled();

        this.#idleTimer = idleTimer;
        this.#idleTimer.onTimeout(this.#handleIdleTimerTimeout);

        if (this.#locks[masterLockType]) {
            this.#locks[masterLockType].onEnabledChange(this.#handleMasterLockEnabledChange);
        }

        if (!this.#pristine) {
            this.#idleTimer.restart();
        } else {
            this.#secret.generate();
        }

        this.#secret.onDefinedChange(this.#handleSecretDefinedChange);
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
        return this.#locks[type];
    }

    lock() {
        if (this.#pristine) {
            throw new PristineError();
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
    const secret = createSecret(new LockerLockedError());

    const locks = await createLocks(storage, secret, masterLockType);
    const idleTimer = await createIdleTimer(storage);

    return new Locker({ storage, secret, locks, idleTimer, masterLockType });
};

export default createLocker;
