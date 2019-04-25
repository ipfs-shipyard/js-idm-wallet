import { InvalidProfilePropertyError } from '../../utils/errors';

const PROFILE_KEY_PREFIX = 'profile!';

const PROFILE_TYPES = ['person', 'organization', 'other'];

class Profile {
    #schema

    constructor(schema) {
        this.#schema = schema;
    }

    getSchema() {
        return this.#schema;
    }
}

const getProfileKey = (identityKey) => `${PROFILE_KEY_PREFIX}${identityKey}`;

export const assertProfile = (schema) => {
    const { '@type': type, name } = schema;

    if (!type || !PROFILE_TYPES.includes(type)) {
        throw new InvalidProfilePropertyError('type', type);
    }

    if (!name || typeof name !== 'string') {
        throw new InvalidProfilePropertyError('name', name);
    }
};

export const createProfile = async (schema, identityKey, storage) => {
    const key = getProfileKey(identityKey);

    assertProfile(schema);

    await storage.set(key, schema, { encrypt: true });

    return new Profile(schema);
};

export const restoreProfile = async (identityKey, storage) => {
    const key = getProfileKey(identityKey);

    const schema = await storage.get(key);

    assertProfile(schema);

    return new Profile(schema);
};

export const removeProfile = async (identityKey, storage) => storage.remove(getProfileKey(identityKey));
