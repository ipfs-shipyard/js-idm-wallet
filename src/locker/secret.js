import signal from 'pico-signals';

const SECRET_LENGTH = 32;

class Secret {
    #secret;
    #undefinedError;
    #onDefinedChange = signal();

    constructor({ undefinedError }) {
        this.#undefinedError = undefinedError;
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

    set(secret) {
        const wasUndefined = !this.has();

        this.#secret = secret;

        wasUndefined && this.#onDefinedChange.dispatch(this.#secret);
    }

    unset() {
        if (!this.has()) {
            return;
        }

        this.#secret = null;
        this.#onDefinedChange.dispatch(this.#secret);
    }

    generate() {
        this.set(crypto.getRandomValues(new Uint8Array(SECRET_LENGTH)));
    }

    onDefinedChange(fn) {
        return this.#onDefinedChange.add(fn);
    }
}

const createSecret = (undefinedError) => new Secret({ undefinedError });

export default createSecret;
