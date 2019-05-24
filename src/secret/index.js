import signal from 'pico-signals';
import pDefer from 'p-defer';
import { LockerLockedError } from '../utils/errors';

const SECRET_LENGTH = 32;

class Secret {
    #secret;
    #undefinedError;
    #semaphore = pDefer();
    #onDefinedChange = signal();

    constructor(undefinedError) {
        this.#undefinedError = undefinedError || new LockerLockedError();
    }

    has() {
        return this.#secret != null;
    }

    get() {
        if (!this.#secret) {
            throw this.#undefinedError;
        }

        return this.#secret;
    }

    async getAsync() {
        await this.#semaphore.promise;

        return this.#secret;
    }

    set(secret) {
        const wasUndefined = !this.has();

        this.#secret = secret;
        this.#semaphore.resolve();
        wasUndefined && this.#onDefinedChange.dispatch(this.#secret);
    }

    unset() {
        if (!this.has()) {
            return;
        }

        this.#secret = null;
        this.#semaphore = pDefer();
        this.#onDefinedChange.dispatch(this.#secret);
    }

    generate() {
        this.set(crypto.getRandomValues(new Uint8Array(SECRET_LENGTH)));
    }

    onDefinedChange(fn) {
        return this.#onDefinedChange.add(fn);
    }
}

const createSecret = (undefinedError) => new Secret(undefinedError);

export default createSecret;
