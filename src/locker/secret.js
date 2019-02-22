import signal from 'pico-signals';

const SECRET_LENGTH = 32;

class Secret {
    #secret;
    #unavailabeError;
    #onDefinedChange = signal();

    constructor({ unavailabeError, pristine }) {
        this.#unavailabeError = unavailabeError;

        if (pristine) {
            this.#generate();
        }
    }

    has() {
        return this.#secret != null;
    }

    get() {
        if (!this.#secret) {
            throw this.#unavailabeError;
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

const createSecret = (unavailabeError, pristine) => new Secret({ unavailabeError, pristine });

export default createSecret;
