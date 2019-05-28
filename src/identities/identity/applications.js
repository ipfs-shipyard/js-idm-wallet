import signal from 'pico-signals';
import { loadStore, dropStore } from './utils/orbitdb';
import { assertApplication } from './utils/asserts';
import { UnknownAppError } from '../../utils/errors';
import { ORBITDB_APP_STORE_NAME, ORBITDB_APP_DEVICES_STORE_NAME, ORBITDB_STORE_TYPE } from './utils/constants/applications';

class Applications {
    #currentDeviceId;
    #identityDescriptor;

    #appsStore;
    #appsDevicesStore;

    #onChange = signal();
    #onRevoke = signal();
    #onLinkChange = signal();

    constructor(currentDeviceId, identityDescriptor, appsStore, appsDevicesStore) {
        this.#currentDeviceId = currentDeviceId;
        this.#identityDescriptor = identityDescriptor;

        this.#appsStore = appsStore;
        this.#appsDevicesStore = appsDevicesStore;

        this.#appsStore.events.on('write', this.#handleStoreChanges);
        this.#appsStore.events.on('replicated', this.#handleStoreChanges);
        this.#appsDevicesStore.events.on('write', this.#handleStoreChanges);
        this.#appsDevicesStore.events.on('replicated', this.#handleStoreChanges);
    }

    list() {
        return Object.keys(this.#appsDevicesStore.all).reduce((acc, key) => {
            const [appId, deviceId] = key.split('!');
            const app = this.#appsStore.get(appId);

            if (app && deviceId === this.#currentDeviceId) {
                acc.push(app);
            }

            return acc;
        }, []);
    }

    async add(app) {
        assertApplication(app);

        await this.#appsStore.put(app.id, app);
    }

    async revoke(appId) {
        const appsDevicesKeys = Object.keys(this.#appsDevicesStore.all).filter((key) => key.includes(appId));

        await Promise.all(appsDevicesKeys.map((key) => this.#appsDevicesStore.del(key)));
        await this.#appsStore.del(appId);

        this.#dispatchRevoke(appId);
    }

    async linkCurrentDevice(appId) {
        if (!this.#appsStore.get(appId)) {
            throw new UnknownAppError(appId);
        }

        const key = this.#getCurrentDeviceAppKey(appId);

        if (this.#appsDevicesStore.get(key)) {
            return;
        }

        await this.#appsDevicesStore.put(key, true);

        this.#dispatchLinkCurrentChange(appId, true);
    }

    async unlinkCurrentDevice(appId) {
        const key = this.#getCurrentDeviceAppKey(appId);
        const wasLinked = this.#appsDevicesStore.get(key);

        await this.#appsDevicesStore.del(key);

        if (wasLinked) {
            this.#dispatchLinkCurrentChange(appId, false);
        }
    }

    onChange(fn) {
        return this.#onChange.add(fn);
    }

    onRevoke(fn) {
        return this.#onRevoke.add(fn);
    }

    onLinkCurrentChange(fn) {
        return this.#onLinkChange.add(fn);
    }

    #getCurrentDeviceAppKey = (appId) => `${appId}!${this.#currentDeviceId}`

    #dispatchRevoke = (appId) => {
        this.#onRevoke.dispatch(appId);
    }

    #dispatchLinkCurrentChange = (appId, isLinked) => {
        this.#onLinkChange.dispatch({ appId, deviceId: this.currentDeviceId, isLinked });
    }

    #handleStoreChanges = () => {
        this.#onChange.dispatch(this.list(), this.identityDescriptor.id);
    }
}

const loadOrbitdbStores = async (orbitdb) => {
    const appsStore = await loadStore(orbitdb, ORBITDB_APP_STORE_NAME, ORBITDB_STORE_TYPE);
    const appsDevicesStore = await loadStore(orbitdb, ORBITDB_APP_DEVICES_STORE_NAME, ORBITDB_STORE_TYPE);

    await appsStore.load();
    await appsDevicesStore.load();

    return { appsStore, appsDevicesStore };
};

export const createApplications = async (currentDeviceId, identityDescriptor, orbitdb) => {
    const { appsStore, appsDevicesStore } = await loadOrbitdbStores(orbitdb, identityDescriptor.id);

    return new Applications(currentDeviceId, identityDescriptor, appsStore, appsDevicesStore);
};

export const removeApplications = async (identityDescriptor, orbitdb) => {
    await dropStore(orbitdb, ORBITDB_APP_STORE_NAME, ORBITDB_STORE_TYPE);
    await dropStore(orbitdb, ORBITDB_APP_DEVICES_STORE_NAME, ORBITDB_STORE_TYPE);
};
