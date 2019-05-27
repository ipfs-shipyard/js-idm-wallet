import pReduce from 'p-reduce';
import signal from 'pico-signals';
import { sha256 } from '../../utils/sha';
import { UnableCreateIdentityError } from '../../utils/errors';
import { getDescriptorKey, DESCRIPTOR_KEY_PREFIX } from './utils/storage-keys';
import { getOrbitDb, dropOrbitDb, stopOrbitDbReplication } from './utils/orbitdb';
import * as devicesFns from './devices';
import * as backupFns from './backup';
import * as profileFns from './profile';
import * as appsFns from './applications';

class Identity {
    #descriptor;
    #storage;
    #orbitdb;

    backup;
    devices;
    profile;
    apps;

    #onRevoke = signal();

    constructor(descriptor, storage, orbitdb, devices, backup, profile, apps) {
        this.#descriptor = descriptor;
        this.#storage = storage;
        this.#orbitdb = orbitdb;

        this.backup = backup;
        this.devices = devices;
        this.profile = profile;
        this.apps = apps;

        this.devices.onCurrentRevoke(this.#handleDevicesCurrentRevoke);

        if (this.devices.getCurrent().revokedAt && !this.isRevoked()) {
            setTimeout(this.#handleDevicesCurrentRevoke, 10);
        }
    }

    getAddedAt() {
        return this.#descriptor.addedAt;
    }

    getId() {
        return this.#descriptor.id;
    }

    getDid() {
        return this.#descriptor.did;
    }

    isRevoked() {
        return this.#descriptor.revoked;
    }

    onRevoke(fn) {
        return this.#onRevoke.add(fn);
    }

    #handleDevicesCurrentRevoke = async () => {
        const key = getDescriptorKey(this.#descriptor.id);

        this.#descriptor.revoked = true;

        try {
            await this.#storage.set(key, this.#descriptor, { encrypt: true });
        } catch (err) {
            console.warn(`Unable to mark identity as revoked: ${this.#descriptor.id}`);
        }

        // Stop replication
        try {
            await stopOrbitDbReplication(this.#orbitdb);
        } catch (err) {
            console.warn(`Unable to stop OrbitDB replication after identity has been revoked: ${this.#descriptor.id}`);
        }

        this.#onRevoke.dispatch();
    }
}

export const peekProfileDetails = async (did, ipfs) => {
    const id = await sha256(did);
    const descriptor = {
        id,
        did,
        addedAt: Date.now(),
        revoked: false,
    };

    const orbitdb = await getOrbitDb(id, ipfs);

    return profileFns.peekProfileDetails(descriptor, ipfs, orbitdb);
};

export const createIdentity = async ({ did, currentDevice, backupData, profileDetails }, storage, didm, ipfs) => {
    const id = await sha256(did);
    const descriptor = {
        id,
        did,
        addedAt: Date.now(),
        revoked: false,
    };

    const orbitdb = await getOrbitDb(id, ipfs);

    try {
        await storage.set(getDescriptorKey(id), descriptor, { encrypt: true });

        const backup = await backupFns.createBackup(backupData, descriptor, storage);
        const profile = await profileFns.createProfile(profileDetails, descriptor, ipfs, orbitdb);
        const devices = await devicesFns.createDevices(currentDevice, descriptor, didm, storage, orbitdb);
        const apps = await appsFns.createApplications(currentDevice.id, descriptor, orbitdb);

        return new Identity(descriptor, storage, orbitdb, devices, backup, profile, apps);
    } catch (err) {
        await removeIdentity(id, storage, didm, orbitdb);

        throw new UnableCreateIdentityError(err.message, err.code);
    }
};

export const removeIdentity = async (id, storage, didm, ipfs) => {
    const descriptorKey = getDescriptorKey(id);
    const descriptor = await storage.get(descriptorKey);

    if (!descriptor) {
        return;
    }

    await storage.remove(descriptorKey);

    const orbitdb = await getOrbitDb(descriptor.id, ipfs, {
        replicate: false,
    });

    await devicesFns.removeDevices(descriptor, didm, storage, orbitdb);
    await profileFns.removeProfile(descriptor, ipfs, orbitdb);
    await backupFns.removeBackup(descriptor, storage);
    await appsFns.removeApplications(descriptor, orbitdb);

    await dropOrbitDb(orbitdb);
};

export const loadIdentities = async (storage, didm, ipfs) => {
    const identitiesKeys = await storage.list({
        gte: DESCRIPTOR_KEY_PREFIX,
        lte: `${DESCRIPTOR_KEY_PREFIX}\xFF`,
        values: false,
    });

    return pReduce(identitiesKeys, async (acc, key) => {
        const descriptor = await storage.get(key);

        const orbitdb = await getOrbitDb(descriptor.id, ipfs, {
            replicate: !descriptor.revoked,
        });

        const backup = await backupFns.restoreBackup(descriptor, storage);
        const profile = await profileFns.restoreProfile(descriptor, ipfs, orbitdb);
        const devices = await devicesFns.restoreDevices(descriptor, didm, storage, orbitdb);
        const apps = await appsFns.createApplications(devices.getCurrent().id, descriptor, orbitdb);

        const identity = new Identity(descriptor, storage, orbitdb, devices, backup, profile, apps);

        return Object.assign(acc, { [descriptor.id]: identity });
    }, {});
};

export { assertDeviceInfo, generateCurrentDevice } from './devices';
export { assertProfileDetails } from './profile';
