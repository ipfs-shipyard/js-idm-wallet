import signal from 'pico-signals';
import { loadSessions, createSession, removeSession } from './session';
import { UnknownSessionError, UnknownIdentityError, CreateSessionRevokedIdentityError } from '../utils/errors';

class Sessions {
    #sessions;
    #storage;
    #identities;

    #identityListeners = new Map();
    #onDestroy = signal();

    constructor(sessions, storage, identities) {
        this.#sessions = sessions;
        this.#storage = storage;
        this.#identities = identities;

        this.#identities.onLoad(this.#handleIdentitiesLoad);
        this.#identities.onChange(this.#handleIdentitiesChange);
    }

    get(sessionId) {
        if (!this.#sessions[sessionId]) {
            throw new UnknownSessionError(sessionId);
        }

        return this.#sessions[sessionId];
    }

    isValid(sessionId) {
        const session = this.#sessions[sessionId];

        if (!session) {
            return false;
        }

        try {
            const identity = this.#getIdentity(session.getIdentityId());

            return this.#isIdentityRevoked(identity) && session.isValid();
        } catch (err) {
            return false;
        }
    }

    async create(identityId, app, options) {
        const identity = this.#getIdentity(identityId);

        if (this.#isIdentityRevoked(identity)) {
            throw new CreateSessionRevokedIdentityError(identityId);
        }

        const session = this.#getSessionByIdentityAndAppId(identityId, app.id);

        if (session) {
            if (session.isValid()) {
                return session;
            }

            await this.destroy(session.getId());
        }

        const newSession = await createSession({ app, options }, identityId, this.#storage);
        const newSessionId = newSession.getId();

        this.#sessions[newSessionId] = newSession;

        try {
            await identity.apps.add(app);
            await identity.apps.linkCurrentDevice(app.id);
        } catch (err) {
            delete this.#sessions[newSessionId];

            throw err;
        }

        return newSession;
    }

    async destroy(sessionId) {
        const session = this.#sessions[sessionId];

        if (!session) {
            return;
        }

        delete this.#sessions[sessionId];

        try {
            const appId = session.getAppId();
            const identityId = session.getIdentityId();

            if (this.#identities.isLoaded() && this.#identities.has(identityId)) {
                const identity = this.#identities.get(identityId);

                await identity.apps.unlinkCurrentDevice(appId);
            }
        } catch (err) {
            this.#sessions[sessionId] = session;

            throw err;
        }

        await removeSession(sessionId, this.#storage);

        this.#onDestroy.dispatch(sessionId);
    }

    onDestroy(fn) {
        return this.#onDestroy.add(fn);
    }

    #getSessionByIdentityAndAppId = (identityId, appId, sessions = this.#sessions) =>
        Object.values(sessions).find((session) => session.getAppId() === appId && session.getIdentityId() === identityId);

    #getSessionsByIdentityId = (identityId, sessions = this.#sessions) =>
        Object.values(sessions).filter((session) => session.getIdentityId() === identityId);

    #destroySessionsByIdentityId = async (identityId) => {
        const identitySessions = this.#getSessionsByIdentityId(identityId);

        await Promise.all(identitySessions.map((session) => this.destroy(session.getId())));
    }

    #getIdentity = (identityId) => {
        try {
            return this.#identities.get(identityId);
        } catch (err) {
            if (err instanceof UnknownIdentityError) {
                this.#destroySessionsByIdentityId(identityId);
            }

            throw err;
        }
    }

    #isIdentityRevoked = (identity) => {
        const isRevoked = identity.isRevoked();

        if (isRevoked) {
            this.#destroySessionsByIdentityId(identity.getId());
        }

        return isRevoked;
    }

    #addIdentityListeners = (identityId) => {
        if (this.#identityListeners.has(identityId)) {
            return;
        }

        const identity = this.#identities.get(identityId);

        const removeRevokeListener = identity.onRevoke((...args) => this.#handleIdentityRevoke(identityId, ...args));
        const removeLinkChangeListener = identity.apps.onLinkCurrentChange((...args) => this.#handleLinkCurrentChange(identityId, ...args));

        this.#identityListeners.set(identityId, { removeRevokeListener, removeLinkChangeListener });
    }

    #removeIdentityListeners = (identityId) => {
        if (!this.#identityListeners.has(identityId)) {
            return;
        }

        const listeners = this.#identityListeners.get(identityId);

        listeners.removeRevokeListener();
        listeners.removeLinkChangeListener();

        this.#identityListeners.delete(identityId);
    }

    #handleIdentitiesLoad = () => {
        Object.values(this.#identities.list()).forEach((identity) => {
            const apps = identity.apps.list();
            const identityId = identity.getId();

            apps.forEach((app) => {
                const session = this.#getSessionByIdentityAndAppId(identityId, app.id);

                if (!session) {
                    identity.apps.unlinkCurrentDevice(app.id).catch(() => console.warn(`Something went wrong unlinking current device with app "${app.id}" for identity "${identityId}". Will retry on reload.`));
                }
            });

            this.#addIdentityListeners(identity.getId());
        });

        Object.values(this.#sessions).forEach((session) => {
            const sessionId = session.getId();
            const identityId = session.getIdentityId();

            if (!this.#identities.has(identityId) || this.#identities.get(identityId).isRevoked()) {
                this.destroy(sessionId).catch(() => console.warn(`Something went wrong destroying session "${sessionId}" for identity "${identityId}". Will retry on reload.`));
            }
        });
    }

    #handleIdentitiesChange = async (identities, operation) => {
        const { type, id: identityId } = operation;

        if (type !== 'remove') {
            this.#addIdentityListeners(identityId);

            return;
        }

        try {
            await this.#destroySessionsByIdentityId(identityId);

            this.#removeIdentityListeners(identityId);
        } catch (err) {
            console.warn(`Something went wrong destroying sessions for removed identity "${identityId}". Will retry on reload.`);
        }
    }

    #handleIdentityRevoke = async (identityId) => {
        try {
            await this.#destroySessionsByIdentityId(identityId);
        } catch (err) {
            console.warn(`Something went wrong destroying sessions for revoked identity "${identityId}". Will retry on reload.`);
        }
    }

    #handleLinkCurrentChange = async (identityId, { appId, isLinked }) => {
        const session = this.#getSessionByIdentityAndAppId(identityId, appId);

        if (session && !isLinked) {
            const sessionId = session.getId();

            this.destroy(session.getId()).catch(() => console.warn(`Something went wrong destroying session "${sessionId}" for app "${appId} of identity "${identityId}" . Will retry on reload.`));
        } else if (!session && isLinked) {
            const sessions = await loadSessions(this.#storage);
            const newSession = this.#getSessionByIdentityAndAppId(identityId, appId, sessions);

            if (newSession) {
                this.#addIdentityListeners(identityId);

                this.#sessions[newSession.getId()] = newSession;
            }
        }
    }
}

const createSessions = async (storage, identities) => {
    const sessions = await loadSessions(storage);

    return new Sessions(sessions, storage, identities);
};

export default createSessions;
