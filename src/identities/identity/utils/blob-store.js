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

        let ref = this.#refs.get(key);

        // Skip if hash & type are the same and it's already loaded to avoid triggering change
        if (ref && ref.type === type && ref.hash === hash && ref.content.status === 'fulfilled') {
            return ref;
        }

        ref = {
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

        // Skip if already removed to avoid triggering change
        if (ref) {
            await this.#ipfs.pin.rm(ref.hash);

            this.#refs.delete(key);
            this.#notifyChange(key);
        }
    }

    async sync(refs) {
        const refsKeys = Object.keys(refs);
        const currentKeys = Array.from(this.#refs.keys());

        const removedKeys = difference(currentKeys, refsKeys);
        const addedKeys = difference(refsKeys, currentKeys);
        const updatedKeys = refsKeys.filter((key) => {
            const ref = refs[key];
            const currentRef = this.#refs.get(key);

            return currentRef && (ref.type !== currentRef.type || ref.hash !== currentRef.hash);
        });

        return Promise.all([
            ...removedKeys.map((key) => this.#syncRemoved(key)),
            ...addedKeys.map((key) => this.#syncAddedOrUpdated(key, refs[key])),
            ...updatedKeys.map((key) => this.#syncAddedOrUpdated(key, refs[key])),
        ]);
    }

    onChange(fn) {
        return this.#onChange.add(fn);
    }

    #syncRemoved = async (key) => {
        const ref = this.#refs.get(key);

        this.#refs.delete(key);
        this.#notifyChange(key);

        try {
            await this.#ipfs.pin.rm(ref.hash);
        } catch (err) {
            console.warn(`Unable to remove "${key}" from blob store`, err);
        }
    }

    #syncAddedOrUpdated = async (key, ref) => {
        ref = {
            ...ref,
            content: {
                status: 'pending',
                error: undefined,
                data: undefined,
                dataUri: undefined,
            },
        };

        // Mark the blob as pending
        this.#refs.set(key, ref);
        this.#notifyChange(key);

        // Attempt to load the blob
        let content;

        try {
            const [{ content: buffer }] = await this.#ipfs.get(ref.hash);

            // Pin the hash so that we can serve it to others
            await this.#ipfs.pin.add(ref.hash);

            const data = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

            content = {
                status: 'fulfilled',
                error: undefined,
                data,
                dataUri: this.#getDataUri(ref.type, buffer),
            };
        } catch (error) {
            content = {
                status: 'rejected',
                error,
                data: undefined,
                dataUri: undefined,
            };
        }

        const stillExactSame = this.#refs.get(key) === ref;

        if (stillExactSame) {
            this.#refs.set(key, { ...ref, content });
            this.#notifyChange(key, true);
        }
    }

    #isSame = (ref1, ref2) => ref1.type === ref2.type && ref1.hash === ref2.hash;

    #getDataUri = (type, buffer) => `data:${type};base64,${buffer.toString('base64')}`;

    #notifyChange = (key, async = false) => {
        this.#onChange.dispatch(key, this.#refs.get(key), async);
    }
}

const createBlobStore = (ipfs) => new BlobStore(ipfs);

export default createBlobStore;
