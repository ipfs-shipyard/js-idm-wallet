import pReduce from 'p-reduce';
import signal from 'pico-signals';
import { createSigner } from 'idm-signatures';
import { formatDid } from '../../utils/did';
import { UnableCreateIdentityError } from '../../utils/errors';
import { getDescriptorKey, DESCRIPTOR_KEY_PREFIX } from './utils/storage-keys';
import { getOrbitDb, dropOrbitDb, stopOrbitDbReplication } from './utils/orbitdb';
import { hashSha256 } from '../../utils/crypto';
import * as devicesFns from './devices';
import * as backupFns from './backup';
import * as profileFns from './profile';
import * as appsFns from './apps';

class Identity {
    #descriptor;
    #storage;
    #orbitdb;
    #devices;
    #backup;
    #profile;
    #apps;

    #signer;
    #onRevoke = signal();

    constructor(descriptor, storage, orbitdb, devices, backup, profile, apps) {
        this.#descriptor = descriptor;
        this.#storage = storage;
        this.#orbitdb = orbitdb;
        this.#backup = backup;
        this.#devices = devices;
        this.#profile = profile;
        this.#apps = apps;

        this.#devices.onCurrentRevoke(this.#handleDevicesCurrentRevoke);

        if (this.#devices.getCurrent().revokedAt && !this.isRevoked()) {
            setTimeout(this.#handleDevicesCurrentRevoke, 10);
        }
    }

    get backup() {
        return this.#backup;
    }

    get devices() {
        return this.#devices;
    }

    get profile() {
        return this.#profile;
    }

    get apps() {
        return this.#apps;
    }

    getId() {
        return this.#descriptor.id;
    }

    getDid() {
        return this.#descriptor.did;
    }

    getAddedAt() {
        return this.#descriptor.addedAt;
    }

    isRevoked() {
        return this.#descriptor.revoked;
    }

    onRevoke(fn) {
        return this.#onRevoke.add(fn);
    }

    getSigner() {
        if (!this.#signer) {
            this.#signer = this.#createSigner();
        }

        return this.#signer;
    }

    #createSigner = () => {
        const { didPublicKeyId, keyMaterial } = this.#devices.getCurrent();
        const didUrl = formatDid({ did: this.getDid(), fragment: didPublicKeyId });

        return createSigner(didUrl, keyMaterial.privateKeyPem);
    }

    #handleDevicesCurrentRevoke = async () => {
        const key = getDescriptorKey(this.#descriptor.id);

        this.#descriptor.revoked = true;

        try {
            await this.#storage.set(key, this.#descriptor, { encrypt: true });
        } catch (err) {
            console.warn(`Unable to mark identity as revoked: ${this.#descriptor.id}`, err);
        }

        // Stop replication
        try {
            await stopOrbitDbReplication(this.#orbitdb);
        } catch (err) {
            console.warn(`Unable to stop OrbitDB replication after identity has been revoked: ${this.#descriptor.id}`, err);
        }

        this.#onRevoke.dispatch();
    }
}

export const peekProfileDetails = async (did, ipfs) => {
    const id = await hashSha256(did, true);
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
    const id = await hashSha256(did, true);
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
        const apps = await appsFns.createApps(currentDevice.id, descriptor, orbitdb);

        return new Identity(descriptor, storage, orbitdb, devices, backup, profile, apps);
    } catch (err) {
        await removeIdentity(id, storage, orbitdb);

        throw new UnableCreateIdentityError(err.message, err.code);
    }
};

export const removeIdentity = async (id, storage, ipfs) => {
    const descriptorKey = getDescriptorKey(id);
    const descriptor = await storage.get(descriptorKey);

    if (!descriptor) {
        return;
    }

    await storage.remove(descriptorKey);

    const orbitdb = await getOrbitDb(descriptor.id, ipfs, {
        replicate: false,
    });

    await devicesFns.removeDevices(descriptor, storage, orbitdb);
    await profileFns.removeProfile(descriptor, ipfs, orbitdb);
    await backupFns.removeBackup(descriptor, storage);
    await appsFns.removeApps(descriptor, orbitdb);

    await dropOrbitDb(orbitdb);
};

export const loadIdentities = async (storage, didm, ipfs) => {
    const descriptors = await storage.list({
        gte: DESCRIPTOR_KEY_PREFIX,
        lte: `${DESCRIPTOR_KEY_PREFIX}\xFF`,
        keys: false,
    });

    return pReduce(descriptors, async (acc, descriptor) => {
        const orbitdb = await getOrbitDb(descriptor.id, ipfs, {
            replicate: !descriptor.revoked,
        });

        const backup = await backupFns.restoreBackup(descriptor, storage);
        const profile = await profileFns.restoreProfile(descriptor, ipfs, orbitdb);
        const devices = await devicesFns.restoreDevices(descriptor, didm, storage, orbitdb);
        const apps = await appsFns.createApps(devices.getCurrent().id, descriptor, orbitdb);

        const identity = new Identity(descriptor, storage, orbitdb, devices, backup, profile, apps);

        return Object.assign(acc, { [descriptor.id]: identity });
    }, {});
};

export { assertDeviceInfo, assertProfileDetails } from './utils/asserts';
export { generateCurrentDevice } from './devices';
export { assertApp } from './apps';
