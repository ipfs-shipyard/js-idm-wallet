import nanoidGenerate from 'nanoid/generate';
import { assertSessionOptions } from './utils/asserts';
import { DESCRIPTOR_KEY_PREFIX, getSessionKey } from './utils/storage-keys';

const DEFAULT_MAX_AGE = 7776000000;

class Session {
    #descriptor;

    constructor(descriptor) {
        this.#descriptor = descriptor;
    }

    getId() {
        return this.#descriptor.id;
    }

    getAppId() {
        return this.#descriptor.appId;
    }

    getIdentityId() {
        return this.#descriptor.identityId;
    }

    getCreatedAt() {
        return this.#descriptor.createAt;
    }

    isValid() {
        return this.#descriptor.expiresAt > Date.now();
    }
}

export const createSession = async ({ app, options = {} }, identity, storage) => {
    assertSessionOptions(options);

    options = {
        ...options,
        maxAge: options.maxAge || DEFAULT_MAX_AGE,
    };

    await identity.apps.add(app);
    await identity.apps.linkCurrentDevice(app.id);

    const descriptor = {
        id: nanoidGenerate('1234567890abcdef', 32),
        appId: app.id,
        identityId: identity.getId(),
        createAt: Date.now(),
        expiresAt: Date.now() + options.maxAge,
    };

    await storage.set(getSessionKey(descriptor.id), descriptor);

    return new Session(descriptor);
};

export const removeSession = async (sessionId, identities, storage) => {
    const key = getSessionKey(sessionId);
    const sessionDescriptor = await storage.get(key);

    if (!sessionDescriptor) {
        return;
    }

    if (identities.has(sessionDescriptor.identityId)) {
        const identity = identities.get(sessionDescriptor.identityId);

        await identity.apps.unlinkCurrentDevice(sessionDescriptor.appId);
    }

    await storage.remove(key);
};

export const loadSessions = async (storage) => {
    const sessions = await storage.list({
        gte: DESCRIPTOR_KEY_PREFIX,
        lte: `${DESCRIPTOR_KEY_PREFIX}\xFF`,
        keys: false,
    });

    return sessions.reduce((acc, descriptor) => Object.assign(acc, { [descriptor.id]: new Session(descriptor) }), {});
};
