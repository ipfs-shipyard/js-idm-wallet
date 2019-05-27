import { loadSessions, createSession, removeSession } from './session';
import { UnknownSessionError } from '../utils/errors';

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
        const session = this.#getSessionByIdentityAndAppId(identityId, app.id);

        console.log('Here');
        if (session) {
            console.log('Session Exists!');
            if (session.isValid()) {
                console.log('Returning Same Session since is valid');
                return session;
            }

            console.log('Existing session is not valid. Destroying before creating a new one');
            await this.destroy(session.getId());
        }

        const identity = this.#identities.get(identityId);

        const newSession = await createSession({ app, options }, identity, this.#storage);
        const newSessionId = newSession.getId();

        this.#addIdentityListeners(identityId);

        this.#sessions[newSessionId] = newSession;

        return newSession;
    }

    async destroy(sessionId) {
        if (!this.#sessions[sessionId]) {
            return;
        }

        const identityId = this.#sessions[sessionId].getIdentityId();

        this.#removeIdentityListeners(identityId);

        try {
            console.log('Will Destroy Session', sessionId);
            await removeSession(sessionId, this.#identities, this.#storage);

            delete this.#sessions[sessionId];
        } catch (err) {
            this.#addIdentityListeners(identityId);

            throw err;
        }
    }

    #getSessionByIdentityAndAppId = (identityId, appId) =>
        Object.values(this.#sessions).find((session) => session.getAppId() === appId && session.getIdentityId() === identityId);

    #removeIdentityListeners = (identityId) => {
        if (!this.#identityListeners[identityId]) {
            return;
        }

        console.log('Remove Identity Listeners', identityId);
        this.#identityListeners[identityId].removeOnRevoke && this.#identityListeners[identityId].removeOnRevoke();
        this.#identityListeners[identityId].removeOnLinkCurrent && this.#identityListeners[identityId].removeOnLinkCurrent();

        delete this.#identityListeners[identityId];
    }

    #addIdentityListeners = (identityId) => {
        const identity = this.#identities.get(identityId);

        this.#removeIdentityListeners(identityId);

        console.log('Add Identity Listeners', identityId);
        this.#identityListeners[identityId] = {
            removeOnRevoke: identity.apps.onRevoke((...args) => this.#handleAppRevoke(identityId, ...args)),
            removeOnLinkCurrent: identity.apps.onLinkCurrentChange((...args) => this.#handleLinkCurrentChange(identityId, ...args)),
        };
    }

    #handleAppRevoke = async (identityId, appId) => {
        console.log('App Revoke Will Handle!');
        const session = this.#getSessionByIdentityAndAppId(identityId, appId);

        if (!session) {
            return;
        }

        try {
            await this.destroy(session.getId());
        } catch (err) {
            console.error(`Something went wrong destroying session after app "${appId}" revocation for identity "${identityId}"`);
        }
    }

    #handleLinkCurrentChange = async (identityId, { appId, isLinked }) => {
        console.log('Link Change Will Handle!');
        const session = this.#getSessionByIdentityAndAppId(identityId, appId);

        console.log({ identityId, appId });
        console.log(isLinked, session);
        if (isLinked || !session) {
            return;
        }

        try {
            await this.destroy(session.getId());
        } catch (err) {
            console.error(`Something went wrong destroying session after app "${appId}" revocation for identity "${identityId}" in current device`);
        }
    }

    #handleIdentitiesLoad = () => {
        console.log('Sessions Handle Identities Load');
        Object.values(this.#sessions).forEach((session) => this.#addIdentityListeners(session.getIdentityId()));
    }
}

const createSessions = async (storage, identities) => {
    const sessions = await loadSessions(storage);

    return new Sessions(sessions, storage, identities);
};

export default createSessions;
