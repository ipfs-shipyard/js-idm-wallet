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

    #currentDeviceAppsList = [];

    #onChange = signal();
    #onRevoke = signal();
    #onLinkChange = signal();

    constructor(currentDeviceId, identityDescriptor, appsStore, appsDevicesStore) {
        this.#currentDeviceId = currentDeviceId;
        this.#identityDescriptor = identityDescriptor;

        this.#appsStore = appsStore;
        this.#appsDevicesStore = appsDevicesStore;

        this.#appsStore.events.on('write', this.#handleAppsStoreChange);
        this.#appsStore.events.on('replicated', this.#handleAppsStoreChange);
        this.#appsDevicesStore.events.on('write', this.#handleAppsDevicesStoreChange);
        this.#appsDevicesStore.events.on('replicated', this.#handleAppsDevicesStoreChange);

        this.#updateCurrentDeviceAppsList();
    }

    list() {
        return this.#currentDeviceAppsList;
    }

    async add(app) {
        assertApplication(app);

        await this.#appsStore.put(app.id, app);
    }

    async revoke(appId) {
        const appsDevicesKeys = Object.keys(this.#appsDevicesStore.all);
        const filteredKeys = appsDevicesKeys.filter((key) => this.#parseCurrentDeviceAppKey(key).appId === appId);

        await Promise.all(filteredKeys.map((key) => this.#appsDevicesStore.del(key)));

        await this.#appsStore.del(appId);
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
    }

    async unlinkCurrentDevice(appId) {
        const key = this.#getCurrentDeviceAppKey(appId);

        if (typeof this.#appsDevicesStore.all[key] === 'undefined') {
            return;
        }

        await this.#appsDevicesStore.del(key);
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

    #parseCurrentDeviceAppKey = (key) => {
        const [appId, deviceId] = key.split('!');

        return { appId, deviceId };
    }

    #updateCurrentDeviceAppsList = () => {
        this.#currentDeviceAppsList = Object.keys(this.#appsDevicesStore.all).reduce((acc, key) => {
            const { appId, deviceId } = this.#parseCurrentDeviceAppKey(key);
            const app = this.#appsStore.get(appId);

            if (app && deviceId === this.#currentDeviceId) {
                acc.push(app);
            }

            return acc;
        }, []);
    }

    #dispatchRevoke = (appId) => {
        this.#onRevoke.dispatch(appId);
    }

    #dispatchLinkCurrentChange = (appId, isLinked) => {
        this.#onLinkChange.dispatch({ appId, deviceId: this.currentDeviceId, isLinked });
    }

    #handleAppsStoreChange = (store, { payload }) => {
        const { op, key } = payload;

        this.#updateCurrentDeviceAppsList();

        this.#onChange.dispatch(this.#currentDeviceAppsList, this.#identityDescriptor.id);

        if (op === 'DEL') {
            this.#dispatchRevoke(key);
        }
    }

    #handleAppsDevicesStoreChange = (store, { payload }) => {
        const { op, key } = payload;
        const { appId, deviceId } = this.#parseCurrentDeviceAppKey(key);

        this.#updateCurrentDeviceAppsList();

        this.#onChange.dispatch(this.#currentDeviceAppsList, this.#identityDescriptor.id);

        if (deviceId === this.#currentDeviceId) {
            if (op === 'PUT') {
                this.#dispatchLinkCurrentChange(appId, true);
            } else if (op === 'DEL') {
                this.#dispatchLinkCurrentChange(appId, false);
            }
        }
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
