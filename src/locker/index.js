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
    #masterLockType;

    #onLocked = signal();

    idleTimer;
    masterLock;

    constructor({ storage, secret, locks, idleTimer, masterLockType }) {
        this.#locks = locks;
        this.#secret = secret;
        this.#storage = storage;
        this.#masterLockType = masterLockType;

        this.masterLock = this.#locks[masterLockType];

        this.idleTimer = idleTimer;
        this.idleTimer.onTimeout(this.#handleIdleTimerTimeout);

        this.#pristine = !this.masterLock || !this.masterLock.isEnabled();

        if (!this.#pristine) {
            this.idleTimer.restart();
        } else {
            this.#secret.generate();
        }

        if (this.masterLock) {
            this.masterLock.onEnabledChange(this.#handleMasterLockEnabledChange);
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
            this.idleTimer.restart();
        }

        this.#onLocked.dispatch(locked);
    }

    #handleMasterLockEnabledChange = (enabled) => {
        this.#pristine = !enabled;

        if (enabled) {
            this.idleTimer.restart();
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
