import { wrap } from 'lodash';

const stores = new Map();

const openOrbitdbStore = async (orbitdb, identityId, name, type, options) => {
    const storeId = `${identityId}.${name}`;

    // Return store if already exists
    if (stores.has(storeId)) {
        return stores.get(storeId);
    }

    const storePromise = orbitdb.open(storeId, {
        create: true,
        accessController: {
            write: ['*'],
        },
        ...options,
        type,
    });

    // Store the in-flight promise in to the stores cache
    // If someone calls openOrbitdbStore in between, this will return the same promise for the same store
    stores.set(storeId, storePromise);

    // Wait for the promise to succeed
    // If it fails, remove it from the stores cache, avoiding a "dead-end" in case of failures
    let store;

    try {
        store = await storePromise;
    } catch (err) {
        stores.delete(storeId);
        throw err;
    }

    // Wrap close() and drop() in order to remove from the stores cache automaticall
    store.close = wrap(store.close, async (close) => {
        await close.call(store);
        stores.delete(storeId);
    });

    store.drop = wrap(store.drop, async (drop) => {
        await drop.call(store,);
        stores.delete(storeId);
    });

    return store;
};

export default openOrbitdbStore;
