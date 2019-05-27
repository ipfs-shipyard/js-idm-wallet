import { Buffer } from 'buffer';
import signal from 'pico-signals';
import { difference } from 'lodash';

class BlobStore {
    #ipfs;
    #refs = new Map();
    #onChange = signal();

    constructor(ipfs) {
        this.#ipfs = ipfs;
    }

    get(key) {
        return this.#refs.get(key);
    }

    async put(key, blob) {
        const { type, data } = blob;
        const buffer = Buffer.from(data);

        const [{ hash }] = await this.#ipfs.add(buffer, { pin: true });

        const ref = {
            type,
            hash,
            content: {
                status: 'fulfilled',
                data,
                dataUri: this.#getDataUri(type, buffer),
            },
        };

        this.#refs.set(key, ref);
        this.#notifyChange(key);

        return ref;
    }

    async del(key) {
        const ref = this.#refs.get(key);

        if (ref) {
            await this.#ipfs.pin.rm(ref.hash);

            this.#refs.delete(key);
            this.#notifyChange(key);
        }
    }

    async sync(refs) {
        const refsKeys = Object.keys(refs);
        const storeKeys = Array.from(this.#refs.keys());

        const removedKeys = difference(storeKeys, refsKeys);
        const addedKeys = difference(refsKeys, storeKeys);

        return Promise.all([
            ...removedKeys.map((key) => this.#syncRemoved(key)),
            ...addedKeys.map((key) => this.#syncAdded(key, refs[key])),
        ]);
    }

    onChange(fn) {
        return this.#onChange.add(fn);
    }

    #syncRemoved = async (key) => {
        try {
            await this.del(key);
        } catch (err) {
            console.warn(`Unable to remove "${key}" from blob store`, err);
        }
    }

    #syncAdded = async (key, ref) => {
        if (ref.content) {
            return;
        }

        const { type, hash } = ref;

        // Mark the blob as pending
        this.#refs.set(key, {
            type,
            hash,
            content: {
                status: 'pending',
                error: undefined,
                data: undefined,
                dataUri: undefined,
            },
        });
        this.#notifyChange(key);

        // Attempt to load the blob
        let content;

        try {
            const [{ content: buffer }] = await this.#ipfs.get(hash);

            // Pin the hash so that we can serve it to others
            await this.#ipfs.pin.add(hash);

            const data = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

            content = {
                status: 'fulfilled',
                error: undefined,
                data,
                dataUri: this.#getDataUri(type, buffer),
            };
        } catch (error) {
            content = {
                status: 'rejected',
                error,
                data: undefined,
                dataUri: undefined,
            };
        }

        // Update the blob if it's still the same (it might have changed meanwhile)
        const stillSameHash = this.#refs.has(key) && this.#refs.get(key).hash === hash;

        if (stillSameHash) {
            this.#refs.set(key, { type, hash, content });
            this.#notifyChange(key);
        }
    }

    #getDataUri = (type, buffer) => `data:${type};base64,${buffer.toString('base64')}`;

    #notifyChange = (key) => {
        this.#onChange.dispatch(key, this.#refs.get(key));
    }
}

const createBlobStore = (ipfs) => new BlobStore(ipfs);

export default createBlobStore;
