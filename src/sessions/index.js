import { loadSessions, createSession, removeSession } from './session';
import { UnknownSessionError, UnknownIdentityError } from '../utils/errors';

class Sessions {
    #sessions;
    #storage;
    #identities;

    #identityListeners = {};

    constructor(sessions, storage, identities) {
        this.#sessions = sessions;
        this.#storage = storage;
        this.#identities = identities;

        this.#identities.onLoad(this.#handleIdentitiesLoad);
        this.#identities.onChange(this.#handleIdentitiesChange);
    }

    getById(sessionId) {
        if (!this.#sessions[sessionId]) {
            throw new UnknownSessionError(sessionId);
        }

        return this.#sessions[sessionId];
    }

    isValid(sessionId) {
        const session = this.#sessions[sessionId];

        return Boolean(session && session.isValid && session.isValid());
    }

    async create(identityId, app, options) {
        const identity = await this.#getIdentity(identityId);

        const session = this.#getSessionByIdentityAndAppId(identityId, app.id);

        if (session) {
            if (session.isValid()) {
                return session;
            }

            await this.destroy(session.getId());
        }

        const newSession = await createSession({ app, options }, identity, this.#storage);

        this.#addIdentityListeners(identityId);

        this.#sessions[newSession.getId()] = newSession;

        return newSession;
    }

    async destroy(sessionId) {
        const session = this.#sessions[sessionId];

        if (!session) {
            return;
        }

        this.#removeIdentityListeners(session.getIdentityId());

        delete this.#sessions[sessionId];

        try {
            await removeSession(sessionId, this.#identities, this.#storage);
        } catch (err) {
            this.#sessions[sessionId] = session;
            this.#addIdentityListeners(session.getIdentityId());

            throw err;
        }
    }

    #getSessionByIdentityAndAppId = (identityId, appId) =>
        Object.values(this.#sessions).find((session) => session.getAppId() === appId && session.getIdentityId() === identityId);

    #getSessionsByIdentityId = (identityId) =>
        Object.values(this.#sessions).filter((session) => session.getIdentityId() === identityId);

    #destroySessionsByIdentityId = async (identityId) => {
        const identitySessions = this.#getSessionsByIdentityId(identityId);

        await Promise.all(identitySessions.map((session) => this.destroy(session.getId())));
    }

    #getIdentity = async (identityId) => {
        try {
            const identity = this.#identities.get(identityId);

            return identity;
        } catch (err) {
            if (err instanceof UnknownIdentityError) {
                await this.#destroySessionsByIdentityId(identityId);
            }

            throw err;
        }
    }

    #addIdentityListeners = (identityId) => {
        if (this.#identityListeners[identityId]) {
            this.#identityListeners[identityId].counter += 1;

            return;
        }

        const identity = this.#identities.get(identityId);

        this.#identityListeners[identityId] = {
            counter: 1,
            removeOnRevoke: identity.apps.onRevoke((...args) => this.#handleAppRevoke(identityId, ...args)),
            removeOnLinkCurrent: identity.apps.onLinkCurrentChange((...args) => this.#handleLinkCurrentChange(identityId, ...args)),
        };
    }

    #removeIdentityListeners = (identityId) => {
        if (!this.#identityListeners[identityId]) {
            return;
        }

        this.#identityListeners[identityId].counter -= 1;

        if (this.#identityListeners[identityId].counter === 0) {
            this.#identityListeners[identityId].removeOnRevoke && this.#identityListeners[identityId].removeOnRevoke();
            this.#identityListeners[identityId].removeOnLinkCurrent && this.#identityListeners[identityId].removeOnLinkCurrent();

            delete this.#identityListeners[identityId];
        }
    }

    #handleIdentitiesLoad = () => {
        Object.values(this.#sessions).forEach((session) => {
            const sessionId = session.getId();
            const identityId = session.getIdentityId();

            if (!this.#identities.has(identityId)) {
                this.destroy(sessionId).catch(() => {
                    delete this.#sessions[sessionId];

                    console.warn(`Something went wrong destroying session "${sessionId}" for unknown identity "${identityId}". Will retry on reload.`);
                });

                return;
            }

            this.#addIdentityListeners(identityId);
        });
    }

    #handleIdentitiesChange = async (identities, operation) => {
        const { type, id } = operation;

        if (type !== 'remove') {
            return;
        }

        await this.#destroySessionsByIdentityId(id);
    }

    #handleAppRevoke = async (identityId, appId) => {
        const session = this.#getSessionByIdentityAndAppId(identityId, appId);

        if (!session) {
            return;
        }

        try {
            await this.destroy(session.getId());
        } catch (err) {
            console.warn(`Something went wrong destroying session after app "${appId}" revocation for identity "${identityId}"`);
        }
    }

    #handleLinkCurrentChange = async (identityId, { appId, isLinked }) => {
        const session = this.#getSessionByIdentityAndAppId(identityId, appId);

        if (isLinked || !session) {
            return;
        }

        try {
            await this.destroy(session.getId());
        } catch (err) {
            console.warn(`Something went wrong destroying session after app "${appId}" revocation for identity "${identityId}" in current device`);
        }
    }
}

const createSessions = async (storage, identities) => {
    const sessions = await loadSessions(storage);

    return new Sessions(sessions, storage, identities);
};

export default createSessions;
