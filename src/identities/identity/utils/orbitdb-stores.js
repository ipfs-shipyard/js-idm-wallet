import { wrap } from 'lodash';

const stores = new Map();

const openOrbitdbStore = async (orbitdb, identityId, name, type, options) => {
    const storeId = `${identityId}.${name}`;

    // Return the store promise if already exists, incrementing the ref count
    // The ref count is a counter used to keep track of the interest in the store
    let entry = stores.get(storeId);

    if (entry) {
        entry.refCount += 1;

        return entry.promise;
    }

    const promise = orbitdb.open(storeId, {
        create: true,
        accessController: {
            write: ['*'],
        },
        ...options,
        type,
    });

    // Store the in-flight promise in to the stores cache
    // If someone calls openOrbitdbStore in between, this will return the same promise for the same store
    entry = { promise, refCount: 1 };
    stores.set(storeId, entry);

    // Wait for the promise to succeed
    // Remove it from the stores cache if it fails, avoiding a "dead-end" in case of failures
    let store;

    try {
        store = await entry.promise;
    } catch (err) {
        stores.delete(storeId);
        throw err;
    }

    // Wrap close() and drop() in order to remove from the stores cache automatically
    // This will only happen effectively once the ref count becomes 0
    store.close = wrap(store.close, async (close) => {
        entry.refCount -= 1;

        if (entry.refCount <= 0) {
            await close.call(store);
            stores.delete(storeId);
        }
    });

    store.drop = wrap(store.drop, async (drop) => {
        entry.refCount -= 1;

        if (entry.refCount <= 0) {
            await drop.call(store);
            stores.delete(storeId);
        }
    });

    return store;
};

export default openOrbitdbStore;
