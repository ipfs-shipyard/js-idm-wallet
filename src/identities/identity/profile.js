import signal from 'pico-signals';
import pDelay from 'delay';
import { pick, get, has, isPlainObject, isEqual } from 'lodash';
import {
    InvalidProfilePropertyError,
    InvalidProfileUnsetPropertyError,
    ProfileReplicationTimeoutError,
    UnsupportedProfilePropertyError,
} from '../../utils/errors';
import createBlobStore from './utils/blob-store';
import { loadStore, dropStore, dropOrbitDbIfEmpty, waitStoreReplication } from './utils/orbitdb';

const PROFILE_TYPES = ['Person', 'Organization', 'Thing'];
const PROFILE_MANDATORY_PROPERTIES = ['@context', '@type', 'name'];
const PROFILE_BLOB_PROPERTIES = ['image'];
const PEEK_REPLICATION_WAIT_TIME = 60000;
const PEEK_DROP_DELAY = 60000 * 3;
const ORBITDB_STORE_NAME = 'profile';
const ORBITDB_STORE_TYPE = 'keyvalue';

const peekDropStoreTimers = new Map();

class Profile {
    #orbitdbStore;
    #blobStore;

    #details;
    #onChange = signal();

    constructor(orbitdbStore, blobStore) {
        this.#orbitdbStore = orbitdbStore;
        this.#orbitdbStore.events.on('write', this.#handleOrbitdbStoreChange);
        this.#orbitdbStore.events.on('replicated', this.#handleOrbitdbStoreChange);

        this.#blobStore = blobStore;
        this.#blobStore.onChange(this.#handleBlobStoreChange);

        this.#syncBlobStore();
        this.#maybeUpdateDetails();
    }

    getProperty(key) {
        return this.#blobStore.get(key) || this.#orbitdbStore.get(key);
    }

    async setProperty(key, value) {
        assertProfileProperty(key, value);

        if (PROFILE_BLOB_PROPERTIES.includes(key)) {
            const blobRef = await this.#blobStore.put(key, value);

            value = pick(blobRef, 'type', 'hash');
        }

        if (!isEqual(this.#orbitdbStore.get(key), value)) {
            await this.#orbitdbStore.put(key, value);
        }
    }

    async unsetProperty(key) {
        if (PROFILE_MANDATORY_PROPERTIES.includes(key)) {
            throw new InvalidProfileUnsetPropertyError(key);
        }

        if (has(this.#orbitdbStore.all, key)) {
            await this.#orbitdbStore.del(key);
        }
    }

    getDetails() {
        return this.#details;
    }

    onChange(fn) {
        return this.#onChange.add(fn);
    }

    #syncBlobStore = () => {
        const blobRefs = pick(this.#orbitdbStore.all, PROFILE_BLOB_PROPERTIES);

        this.#blobStore.sync(blobRefs);
    }

    #maybeUpdateDetails = () => {
        const details = { ...this.#orbitdbStore.all };

        PROFILE_BLOB_PROPERTIES.forEach((key) => {
            if (details[key]) {
                const blobRef = this.#blobStore.get(key);

                details[key] = get(blobRef, 'content.dataUri', null);
            }
        });

        if (!isEqual(this.#details, details)) {
            this.#details = details;
        }
    }

    #handleOrbitdbStoreChange = () => {
        this.#syncBlobStore();
        this.#maybeUpdateDetails();
        this.#onChange.dispatch();
    }

    #handleBlobStoreChange = (key, ref, async) => {
        if (async) {
            this.#maybeUpdateDetails();
            this.#onChange.dispatch();
        }
    }
}

const waitProfileReplication = async (orbitdbStore, blobStore) => {
    const completed = await waitStoreReplication(orbitdbStore, {
        timeout: PEEK_REPLICATION_WAIT_TIME,
        completeCondition: () => PROFILE_MANDATORY_PROPERTIES.every((key) => orbitdbStore.get(key) != null),
    });

    if (!completed) {
        throw new ProfileReplicationTimeoutError();
    }

    const image = orbitdbStore.get('image');

    if (image) {
        await Promise.race([
            pDelay(PEEK_REPLICATION_WAIT_TIME).then(() => new ProfileReplicationTimeoutError()),
            blobStore.sync({ image }).catch((err) => {
                console.warn('Unable to replicate image blob, skipping..', err);
            }),
        ]);
    }
};

const peekDropStore = (identityId, orbitdb, orbitdbStore) => {
    const timeoutId = setTimeout(async () => {
        try {
            await orbitdbStore.drop();
            await dropOrbitDbIfEmpty();
        } catch (err) {
            console.warn(`Unable to drop profile OrbitDB store for identity after peeking: ${identityId.id}`, err);
        }
    }, PEEK_DROP_DELAY);

    peekDropStoreTimers.set(orbitdbStore, timeoutId);
};

const cancelPeekDropStore = (orbitdbStore) => {
    const timeoutId = peekDropStoreTimers.get(orbitdbStore);

    clearTimeout(timeoutId);
    peekDropStoreTimers.delete(orbitdbStore);
};

const assertProfileProperty = (key, value) => {
    switch (key) {
    case '@context':
        if (value !== 'https://schema.org') {
            throw new InvalidProfilePropertyError(key, value);
        }
        break;
    case '@type':
        if (!PROFILE_TYPES.includes(value)) {
            throw new InvalidProfilePropertyError(key, value);
        }
        break;
    case 'name':
        if (typeof value !== 'string' || !value.trim()) {
            throw new InvalidProfilePropertyError(key, value);
        }
        break;
    case 'image': {
        if (!isPlainObject(value)) {
            throw new InvalidProfilePropertyError(key, value);
        }
        if (typeof value.type !== 'string') {
            throw new InvalidProfilePropertyError(`${key}.type`, value);
        }

        const typeParts = value.type.split('/');

        if (typeParts.length !== 2 || typeParts[0] !== 'image') {
            throw new InvalidProfilePropertyError(`${key}.type`, value);
        }
        if (!(value.data instanceof ArrayBuffer)) {
            throw new InvalidProfilePropertyError(`${key}.data`, value);
        }
        break;
    }
    default:
        throw new UnsupportedProfilePropertyError(key);
    }
};

export const assertProfileDetails = (details) => {
    PROFILE_MANDATORY_PROPERTIES.forEach((property) => {
        const value = details && details[property];

        if (value == null) {
            throw new InvalidProfilePropertyError(property, value);
        }
    });

    Object.entries(details).forEach(([key, value]) => assertProfileProperty(key, value));
};

export const peekProfileDetails = async (identityDescriptor, ipfs, orbitdb) => {
    const orbitdbStore = await loadStore(orbitdb, ORBITDB_STORE_NAME, ORBITDB_STORE_TYPE);
    const blobStore = createBlobStore(ipfs);

    cancelPeekDropStore(orbitdbStore);

    // Wait for it to replicate if necessary
    await waitProfileReplication(orbitdbStore, blobStore);

    // To allow a fast import of the identity, we delay the drop of the DB
    peekDropStore(identityDescriptor.id, orbitdb, orbitdbStore);

    const profile = new Profile(orbitdbStore, blobStore);

    return profile.getDetails();
};

export const createProfile = async (details, identityDescriptor, ipfs, orbitdb) => {
    const orbitdbStore = await loadStore(orbitdb, ORBITDB_STORE_NAME, ORBITDB_STORE_TYPE);
    const blobStore = createBlobStore(ipfs);
    const profile = new Profile(orbitdbStore, blobStore);

    cancelPeekDropStore(orbitdbStore);

    if (details) {
        for (const [key, value] of Object.entries(details)) {
            await profile.setProperty(key, value); // eslint-disable-line no-await-in-loop
        }
    } else {
        await waitProfileReplication(orbitdbStore, blobStore);
    }

    return profile;
};

export const restoreProfile = async (identityDescriptor, ipfs, orbitdb) => {
    const orbitdbStore = await loadStore(orbitdb, ORBITDB_STORE_NAME, ORBITDB_STORE_TYPE);
    const blobStore = createBlobStore(ipfs);

    cancelPeekDropStore(orbitdbStore);

    return new Profile(orbitdbStore, blobStore);
};

export const removeProfile = async (identityDescriptor, ipfs, orbitdb) => {
    await dropStore(orbitdb, ORBITDB_STORE_NAME, ORBITDB_STORE_TYPE);
};
