import signal from 'pico-signals';
import { InvalidProfilePropertyError, InvalidProfileUnsetPropertyError } from '../../utils/errors';
import openOrbitdbStore from './utils/orbitdb-stores';

const PROFILE_TYPES = ['Person', 'Organization', 'Thing'];
const SCHEMA_MANDATORY_PROPERTIES = ['@context', '@type', 'name'];

class Profile {
    #orbitdbStore;
    #onChange = signal();

    constructor(orbitdbStore) {
        this.#orbitdbStore = orbitdbStore;

        this.#orbitdbStore.events.on('write', this.#handleStoreChange);
        this.#orbitdbStore.events.on('replicated', this.#handleStoreChange);
    }

    toSchema() {
        return this.#orbitdbStore.all;
    }

    getProperty(key) {
        return this.#orbitdbStore.get(key);
    }

    async setProperty(key, value) {
        assertSchemaProperty(key, value);

        await this.#orbitdbStore.put(key, value);
    }

    async unsetProperty(key) {
        if (SCHEMA_MANDATORY_PROPERTIES.includes(key)) {
            throw new InvalidProfileUnsetPropertyError(key);
        }

        await this.#orbitdbStore.del(key);
    }

    onChange(fn) {
        return this.#onChange.add(fn);
    }

    #handleStoreChange = () => {
        this.#onChange.dispatch(this.toSchema());
    }
}

const loadOrbitdbStore = async (orbitdb, identityId) => {
    const store = await openOrbitdbStore(orbitdb, identityId, 'profile', 'keyvalue');

    await store.load();

    return store;
};

const assertSchemaProperty = (key, value) => {
    switch (key) {
    case '@context':
        if (value !== 'https://schema.org') {
            throw new InvalidProfilePropertyError('@context', value);
        }
        break;
    case '@type':
        if (!PROFILE_TYPES.includes(value)) {
            throw new InvalidProfilePropertyError('@type', value);
        }
        break;
    case 'name':
        if (typeof value !== 'string' || !value.trim()) {
            throw new InvalidProfilePropertyError('name', value);
        }
        break;
    default:
        break;
    }
};

export const assertSchema = (schema) => {
    SCHEMA_MANDATORY_PROPERTIES.forEach((property) => {
        if (schema[property] == null) {
            throw new InvalidProfilePropertyError(property, schema[property]);
        }
    });

    Object.entries(schema).forEach(([key, value]) => assertSchemaProperty(key, value));
};

export const createProfile = async (schema, identityDescriptor, orbitdb) => {
    assertSchema(schema);

    const orbitdbStore = await loadOrbitdbStore(orbitdb, identityDescriptor.id);

    for await (const [key, value] of Object.entries(schema)) {
        await orbitdbStore.put(key, value);
    }

    return new Profile(orbitdbStore);
};

export const restoreProfile = async (identityDescriptor, orbitdb) => {
    const orbitdbStore = await loadOrbitdbStore(orbitdb, identityDescriptor.id);

    return new Profile(orbitdbStore);
};

export const removeProfile = async (identityDescriptor, orbitdb) => {
    const orbitdbStore = await loadOrbitdbStore(orbitdb, identityDescriptor.id);

    await orbitdbStore.drop();
};
