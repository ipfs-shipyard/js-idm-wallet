import signal from 'pico-signals';
import pDelay from 'delay';
import pSeries from 'p-series';
import { pick, get, has, isEqual } from 'lodash';
import { loadStore, dropStore, dropOrbitDbIfEmpty, waitStoreReplication } from './utils/orbitdb';
import createBlobStore from './utils/blob-store';
import { assertProfileProperty, assertNonMandatoryProfileProperty } from './utils/asserts';
import { ProfileReplicationTimeoutError } from '../../utils/errors';
import {
    ORBITDB_STORE_NAME,
    ORBITDB_STORE_TYPE,
    PEEK_REPLICATION_WAIT_TIME,
    PEEK_DROP_DELAY,
    PROFILE_BLOB_PROPERTIES,
    PROFILE_MANDATORY_PROPERTIES,
} from './utils/constants/profile';

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

        await this.#saveProperty(key, value);
    }

    async unsetProperty(key) {
        assertNonMandatoryProfileProperty(key);

        await this.#removeProperty(key);
    }

    async setProperties(properties) {
        const tasks = Object.entries(properties)
        .map(([key, value]) => {
            if (value === undefined) {
                assertNonMandatoryProfileProperty(key);

                return () => this.#removeProperty(key);
            }

            assertProfileProperty(key, value);

            return () => this.#saveProperty(key, value);
        });

        return pSeries(tasks);
    }

    getDetails() {
        return this.#details;
    }

    onChange(fn) {
        return this.#onChange.add(fn);
    }

    #saveProperty = async (key, value) => {
        if (PROFILE_BLOB_PROPERTIES.includes(key)) {
            const blobRef = await this.#blobStore.put(key, value);

            value = pick(blobRef, 'type', 'hash');
        }

        if (!isEqual(this.#orbitdbStore.get(key), value)) {
            await this.#orbitdbStore.put(key, value);
        }
    };

    #removeProperty = async (key) => {
        if (has(this.#orbitdbStore.all, key)) {
            await this.#orbitdbStore.del(key);
        }
    };

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
            pDelay.reject(PEEK_REPLICATION_WAIT_TIME, { value: new ProfileReplicationTimeoutError() }),
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
            await dropOrbitDbIfEmpty(orbitdb);
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
