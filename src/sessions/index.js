import signal from 'pico-signals';
import { assertApp } from '../identities';
import { UnknownSessionError, CreateSessionRevokedIdentityError } from '../utils/errors';
import { loadSessions, createSession, removeSession, assertSessionOptions } from './session';

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
        const session = this.#sessions[sessionId];

        if (!session || !session.isValid(sessionId)) {
            throw new UnknownSessionError(sessionId);
        }

        return session;
    }

    isValid(sessionId) {
        const session = this.#sessions[sessionId];

        return Boolean(session && session.isValid());
    }

    async create(identityId, app, options) {
        assertApp(app);
        assertSessionOptions(options);

        const identity = this.#identities.get(identityId);

        if (identity.isRevoked()) {
            throw new CreateSessionRevokedIdentityError(identityId);
        }

        const session = this.#getSessionByIdentityAndAppId(identityId, app.id);

        if (session) {
            if (session.isValid()) {
                return session;
            }

            await this.destroy(session.getId());
        }

        const newSession = await createSession(identity, app, options, this.#storage, this.#identities);
        const newSessionId = newSession.getId();

        this.#sessions[newSessionId] = newSession;

        try {
            await identity.apps.add(app);
            await identity.apps.linkCurrentDevice(app.id);
        } catch (err) {
            delete this.#sessions[newSessionId];

            try {
                await removeSession(newSessionId, this.#storage).catch(() => {});
            } catch (err) {
                console.warn(`Unable to remove session "${newSessionId}" after failed attempt to create app "${app.id}" or link it to "${identityId}". Will cleanup on when identities got loaded again.`, err);
            }

            throw err;
        }

        return newSession;
    }

    async destroy(sessionId) {
        const session = this.#sessions[sessionId];

        if (!session) {
            return;
        }

        await removeSession(sessionId, this.#storage);
        delete this.#sessions[sessionId];

        const appId = session.getAppId();
        const identityId = session.getIdentityId();

        if (this.#identities.isLoaded() && this.#identities.has(identityId)) {
            const identity = this.#identities.get(identityId);

            try {
                await identity.apps.unlinkCurrentDevice(appId);
            } catch (err) {
                console.warn(`Something went wrong unlinking current device with app "${appId}" for identity "${identityId}". Will retry on reload.`, err);
            }
        }

        this.#onDestroy.dispatch(sessionId, session.getMeta());
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
                    identity.apps.unlinkCurrentDevice(app.id)
                    .catch((err) => console.warn(`Something went wrong unlinking current device with app "${app.id}" for identity "${identityId}". Will retry on reload.`, err));
                }
            });

            this.#addIdentityListeners(identity.getId());
        });

        Object.values(this.#sessions).forEach((session) => {
            const sessionId = session.getId();
            const identityId = session.getIdentityId();

            if (!this.#identities.has(identityId) || this.#identities.get(identityId).isRevoked()) {
                this.destroy(sessionId)
                .catch((err) => console.warn(`Something went wrong destroying session "${sessionId}" for identity "${identityId}". Will retry on reload.`, err));
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

            try {
                await this.destroy(session.getId());
            } catch (err) {
                console.warn(`Something went wrong destroying session "${sessionId}" for app "${appId}" of identity "${identityId}" . Will retry on reload.`);
            }
        } else if (!session && isLinked) {
            console.warn(`App "${appId}" of identity "${identityId}" is linked but there's no session. Will fix on reload.`);
        }
    }
}

const createSessions = async (storage, identities) => {
    const sessions = await loadSessions(storage);

    return new Sessions(sessions, storage, identities);
};

export default createSessions;
