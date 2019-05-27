import OrbitDb from 'orbit-db';
import { wrap } from 'lodash';

const instances = new Map();
const instancesStores = new Map();

class DummyBroker {
    async subscribe() {}
    async unsubscribe() {}
    async publish() {}
    async disconnect() {}
}

export const getOrbitDb = async (id, ipfs, options) => {
    let orbitdb = instances.get(id);

    if (orbitdb) {
        return orbitdb;
    }

    options = {
        directory: `./orbitdb-${id}`,
        replicate: true,
        ...options,
    };

    // If we don't want to replicate, create a dummy broker
    // See: https://github.com/orbitdb/orbit-db/blob/ec5102bc99cdd3a4da3a6f1b8f0f14ca59225a40/src/OrbitDB.js#L44
    // See: https://github.com/orbitdb/orbit-db-pubsub
    if (!options.replicate) {
        options.broker = DummyBroker;
    }

    orbitdb = await OrbitDb.createInstance(ipfs, options);

    instances.set(id, orbitdb);
    instancesStores.set(orbitdb, new Map());

    // Wrap disconnect() in order to remove from the cache automatically
    orbitdb.disconnect = wrap(orbitdb.disconnect, async (disconnect) => {
        await disconnect.call(orbitdb, disconnect);
        instances.delete(id);
        instancesStores.delete(orbitdb);
    });

    return orbitdb;
};

export const dropOrbitDb = async (orbitdb) => {
    await orbitdb.keystore.destroy();
    await orbitdb.disconnect();
};

export const dropOrbitDbIfEmpty = async (orbitdb) => {
    const stores = instancesStores.get(orbitdb);

    if (!stores || !stores.size) {
        await dropOrbitDb(orbitdb);
    }
};

export const stopOrbitDbReplication = async (orbitdb) => {
    orbitdb._pubsub.subscribe = async () => {};
    orbitdb._pubsub.publish = async () => {};

    await orbitdb._pubsub.disconnect();
};

export const openStore = async (orbitdb, name, type, options) => {
    const stores = instancesStores.get(orbitdb);

    if (!stores) {
        throw new Error('OrbitDB not created with getOrbitDb() or disconnect() was already called');
    }

    let store = stores.get(name);

    if (store) {
        return store;
    }

    store = await orbitdb.open(name, {
        type,
        create: true,
        accessController: {
            write: ['*'],
        },
        ...options,
    });

    stores.set(name, store);

    // Wrap close() in order to remove from the stores cache automatically
    store.close = wrap(store.close, async (close) => {
        await close.call(store);
        stores.delete(name);
    });

    return store;
};

export const loadStore = async (orbitdb, name, type, options) => {
    const store = await openStore(orbitdb, name, type, options);

    await store.load();

    return store;
};

export const dropStore = async (orbitdb, name, type, options) => {
    // We are not sure if the DB exists phisically or not but this function is supposed to be idempotent
    // Therefore, we ensure it is removed by opening it and dropping it
    const store = await openStore(orbitdb, name, type, {
        replicate: false, // No need to replicate if we are going to drop it
        ...options,
    });

    await store.drop();
};
