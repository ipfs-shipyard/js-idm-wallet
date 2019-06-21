import { Buffer } from 'buffer';
import signal from 'pico-signals';
import { difference } from 'lodash';
import pTimeout from 'p-timeout';
import infuraIpfs from './infura-ipfs';
import { INFURA_IPFS_ENDPOINT, INFURA_ADD_FILE_TIMEOUT, INFURA_HAS_FILE_TIMEOUT } from './constants/infura';
import { InfuraHashMismatch } from '../../../utils/errors';

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

    getUrl(key) {
        const ref = this.#refs.get(key);

        return ref && ref.status === 'synced' ? `${INFURA_IPFS_ENDPOINT}/cat?arg=${ref.hash}` : undefined;
    }

    async put(key, blob) {
        const { type } = blob;

        const hash = await this.#addToIpfs(blob);

        await this.#addToInfura(key, hash, blob.data).catch((err) => console.warn(`Unable to add "${key}" to infura`, err));

        let ref = this.#refs.get(key);

        // Skip if hash & type are the same and it's already loaded to avoid triggering change
        if (ref && ref.type === type && ref.hash === hash && ref.status === 'synced') {
            return ref;
        }

        ref = {
            type,
            hash,
            status: 'synced',
            error: undefined,
        };

        this.#refs.set(key, ref);
        this.#notifyChange(key);

        return ref;
    }

    async del(key) {
        const ref = this.#refs.get(key);

        // Skip if already removed to avoid triggering change
        if (ref) {
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

        await Promise.all([
            ...removedKeys.map((key) => this.#syncRemoved(key)),
            ...addedKeys.map((key) => this.#syncAdded(key, refs[key])),
            ...updatedKeys.map((key) => this.#syncUpdated(key, refs[key])),
        ]);
    }

    onChange(fn) {
        return this.#onChange.add(fn);
    }

    #syncRemoved = async (key) => {
        this.#refs.delete(key);
        this.#notifyChange(key);
    }

    #syncUpdated = async (key, ref) => {
        await this.#syncAdded(key, ref);
    }

    #syncAdded = async (key, ref) => {
        ref = {
            ...ref,
            status: 'syncing',
            error: undefined,
        };

        this.#refs.set(key, ref);
        this.#notifyChange(key);

        let updatedRef;

        // Attempt to pin the blob && ensure it's on infura
        try {
            await this.#ipfs.pin.add(ref.hash);
            await this.#maybeAddToInfura(key, ref.hash).catch((err) => console.warn(`Unable to check and add "${key}" to infura`, err));

            updatedRef = {
                ...ref,
                status: 'synced',
                error: undefined,
            };
        } catch (error) {
            updatedRef = {
                ...ref,
                status: 'error',
                error,
            };
        }

        const stillExactSame = this.#refs.get(key) === ref;

        if (stillExactSame) {
            this.#refs.set(key, updatedRef);
            this.#notifyChange(key, true);
        }
    }

    #notifyChange = (key, async = false) => {
        const ref = this.#refs.get(key);

        this.#onChange.dispatch(key, ref, async);
    }

    #addToIpfs = async (blob) => {
        const buffer = Buffer.from(blob.data);

        const [{ hash }] = await this.#ipfs.add(buffer, { cidVersion: 0, pin: true });

        return hash;
    }

    #maybeAddToInfura = async (key, hash, data) => {
        // Check if files exists in infura
        const exists = await pTimeout(
            infuraIpfs.block.stat(hash).then(() => true),
            INFURA_HAS_FILE_TIMEOUT,
            () => false
        );

        if (exists) {
            return;
        }

        // If there's no data yet, grab it
        if (!data) {
            const [{ content: buffer }] = await this.#ipfs.get(hash);

            data = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
        }

        await this.#addToInfura(key, hash, data);
    }

    #addToInfura = async (key, hash, data) => {
        const buffer = Buffer.from(data);

        const [{ hash: infuraHash }] = await pTimeout(
            infuraIpfs.add(buffer, { cidVersion: 0, pin: true }),
            INFURA_ADD_FILE_TIMEOUT,
        );

        if (infuraHash !== hash) {
            throw new InfuraHashMismatch(infuraHash, hash);
        }

        return hash;
    }
}

const createBlobStore = (ipfs) => new BlobStore(ipfs);

export default createBlobStore;
