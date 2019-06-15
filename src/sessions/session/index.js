import nanoidGenerate from 'nanoid/generate';
import { createSigner } from 'idm-signatures';
import { DESCRIPTOR_KEY_PREFIX, getSessionKey } from './utils/storage-keys';
import { generateDeviceChildKeyMaterial } from '../../utils/crypto';
import { formatDid } from '../../utils/did';

const DEFAULT_MAX_AGE = 7776000000;

class Session {
    #descriptor;
    #signer;

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

    getIdentityDid() {
        return this.#descriptor.identityDid;
    }

    getCreatedAt() {
        return this.#descriptor.createAt;
    }

    getDidPublicKeyId() {
        return this.#descriptor.didPublicKeyId;
    }

    getKeyMaterial() {
        return this.#descriptor.keyMaterial;
    }

    getMeta() {
        return this.#descriptor.meta;
    }

    isValid() {
        return this.#descriptor.expiresAt > Date.now();
    }

    getSigner() {
        if (!this.#signer) {
            this.#signer = this.#createSigner();
        }

        return this.#signer;
    }

    #createSigner = () => {
        const { privateKeyPem, keyPath } = this.getKeyMaterial();
        const didUrl = formatDid({ did: this.getIdentityDid(), fragment: this.getDidPublicKeyId() });

        return createSigner(didUrl, privateKeyPem, keyPath);
    }
}

export const createSession = async (identity, app, options, storage) => {
    options = {
        maxAge: DEFAULT_MAX_AGE,
        ...options,
    };

    const currentDevice = identity.devices.getCurrent();
    const keyMaterial = generateDeviceChildKeyMaterial(currentDevice.keyMaterial.privateExtendedKeyBase58);

    const descriptor = {
        id: nanoidGenerate('1234567890abcdef', 32),
        identityId: identity.getId(),
        identityDid: identity.getDid(),
        appId: app.id,
        createAt: Date.now(),
        expiresAt: Date.now() + options.maxAge,
        didPublicKeyId: currentDevice.didPublicKeyId,
        keyMaterial,
        meta: options.meta,
    };

    await storage.set(getSessionKey(descriptor.id), descriptor);

    return new Session(descriptor);
};

export const removeSession = async (sessionId, storage) => {
    const key = getSessionKey(sessionId);
    const sessionDescriptor = await storage.get(key);

    if (!sessionDescriptor) {
        return;
    }

    await storage.remove(key);
};

export const loadSessions = async (storage) => {
    const descriptors = await storage.list({
        gte: DESCRIPTOR_KEY_PREFIX,
        lte: `${DESCRIPTOR_KEY_PREFIX}\xFF`,
        keys: false,
    });

    const sessions = descriptors.map((descriptor) => new Session(descriptor));

    // Return a object indexed by the session key, while removing expired sessions
    return sessions.reduce((acc, session) => {
        const sessionId = session.getId();

        if (session.isValid()) {
            acc[sessionId] = session;
        } else {
            storage.remove(getSessionKey(sessionId))
            .catch((err) => console.warn(`Unable to remove expired session with id "${sessionId}".  Will retry on reload.`, err));
        }

        return acc;
    }, {});
};

export { assertSessionOptions } from './utils/asserts';
