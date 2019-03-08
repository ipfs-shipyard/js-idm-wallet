import signal from 'pico-signals';

const SECRET_LENGTH = 32;

class Secret {
    #secret;
    #undefinedError;
    #onDefinedChange = signal();

    constructor({ undefinedError, pristine }) {
        this.#undefinedError = undefinedError;

        if (pristine) {
            this.#generate();
        }
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

    onDefinedChange(fn) {
        return this.#onDefinedChange.add(fn);
    }

    #generate = () => {
        this.set(crypto.getRandomValues(new Uint8Array(SECRET_LENGTH)));
    }
}

const createSecret = (undefinedError, pristine) => new Secret({ undefinedError, pristine });

export default createSecret;
