import signal from 'pico-signals';
import createLocks from './locks';
import createIdleTimer from './idle-timer';
import createSecret from './secret';
import { LockerLockedError, PristineError, UnknownLockTypeError } from '../utils/errors';

class Locker {
    #locks;
    #secret;
    #storage;
    #pristine;
    #masterLockType;

    #onLocked = signal();

    idleTimer;
    masterLock;

    constructor(storage, secret, locks, masterLock, idleTimer) {
        this.#storage = storage;
        this.#secret = secret;
        this.#locks = locks;
        this.masterLock = masterLock;
        this.idleTimer = idleTimer;

        this.#pristine = !this.masterLock.isEnabled();

        if (!this.#pristine) {
            this.idleTimer.restart();
        } else {
            this.#secret.generate();
        }

        this.idleTimer.onTimeout(this.#handleIdleTimerTimeout);
        this.masterLock.onEnabledChange(this.#handleMasterLockEnabledChange);
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
        const lock = this.#locks[type];

        if (!lock) {
            throw new UnknownLockTypeError(type);
        }

        return lock;
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
    const idleTimer = await createIdleTimer(storage);
    const locks = await createLocks(storage, secret, masterLockType);
    const masterLock = locks[masterLockType];

    if (!masterLock) {
        throw new UnknownLockTypeError(masterLockType);
    }

    return new Locker(storage, secret, locks, masterLock, idleTimer);
};

export default createLocker;
