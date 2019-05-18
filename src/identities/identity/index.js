import pReduce from 'p-reduce';
import { createDevices, restoreDevices, removeDevices, assertCurrentDevice, DEVICE_ID_PREFIX } from './devices';
import { createBackup, restoreBackup, removeBackup, assertBackupData } from './backup';
import { createProfile, restoreProfile, removeProfile, assertSchema } from './profile';
import { isDidValid } from '../../utils/did';
import { sha256 } from '../../utils/sha';
import { InvalidIdentityPropertyError, UnableCreateIdentityError } from '../../utils/errors';
import { getDescriptorKey, DESCRIPTOR_KEY_PREFIX } from './utils/storage-keys';

class Identity {
    #descriptor;

    constructor(descriptor, devices, backup, profile) {
        this.#descriptor = descriptor;

        this.backup = backup;
        this.devices = devices;
        this.profile = profile;
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
}

const assertIdentityDid = (did) => {
    if (!isDidValid(did)) {
        throw new InvalidIdentityPropertyError('did', did);
    }
};

export const createIdentity = async ({ did, currentDevice, backupData, schema }, storage, didm, orbitdb) => {
    assertIdentityDid(did);

    const id = await sha256(did);
    const key = getDescriptorKey(id);
    const identityDescriptor = { addedAt: Date.now(), did, id };

    try {
        const devices = await createDevices(currentDevice, identityDescriptor, didm, storage, orbitdb);
        const backup = await createBackup(backupData, identityDescriptor, storage);
        const profile = await createProfile(schema, identityDescriptor, orbitdb);

        await storage.set(key, identityDescriptor, { encrypt: true });

        return new Identity(identityDescriptor, devices, backup, profile);
    } catch (err) {
        await removeIdentity(id, storage, didm, orbitdb);

        throw new UnableCreateIdentityError(err.message, err.code);
    }
};

export const removeIdentity = async (id, storage, didm, orbitdb) => {
    const key = getDescriptorKey(id);
    const identityDescriptor = await storage.get(key);

    if (!identityDescriptor) {
        return;
    }

    await removeDevices(identityDescriptor, didm, storage, orbitdb);
    await removeBackup(identityDescriptor, storage);
    await removeProfile(identityDescriptor, orbitdb);

    await storage.remove(key);
};

export const loadIdentities = async (storage, didm, orbitdb) => {
    const identitiesKeys = await storage.list({
        gte: DESCRIPTOR_KEY_PREFIX,
        lte: `${DESCRIPTOR_KEY_PREFIX}\xFF`,
        values: false,
    });

    return pReduce(identitiesKeys, async (acc, key) => {
        const identityDescriptor = await storage.get(key);

        const devices = await restoreDevices(identityDescriptor, didm, storage, orbitdb);
        const backup = await restoreBackup(identityDescriptor, storage);
        const profile = await restoreProfile(identityDescriptor, orbitdb);

        const identity = new Identity(identityDescriptor, devices, backup, profile);

        return Object.assign(acc, { [identityDescriptor.id]: identity });
    }, {});
};

export { assertSchema, assertBackupData, assertCurrentDevice, DEVICE_ID_PREFIX };
