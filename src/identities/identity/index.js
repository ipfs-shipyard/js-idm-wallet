import { createDevices, restoreDevices, removeDevices } from './devices';
import { createBackup, restoreBackup, removeBackup } from './backup';
import { createProfile, restoreProfile, removeProfile } from './profile';
import { isDidValid } from '../../utils';
import { sha256 } from '../../utils/sha';
import { InvalidIdentityPropertyError, UnableCreateIdentityError } from '../../utils/errors';

export const IDENTITY_KEY_PREFIX = 'identity!';

class Identity {
    #id;
    #did;

    constructor(id, did, devices, backup, profile) {
        this.#id = id;
        this.#did = did;

        this.backup = backup;
        this.devices = devices;
        this.profile = profile;
    }

    getId() {
        return this.#id;
    }

    getDid() {
        return this.#did;
    }
}

const getIdentityKey = (id) => `${IDENTITY_KEY_PREFIX}${id}`;

export const assertIdentity = (did) => {
    if (!isDidValid(did)) {
        throw new InvalidIdentityPropertyError('did', did);
    }
};

export const createIdentity = async ({ did, currentDevice, backupData, schema }, storage) => {
    assertIdentity(did);

    const id = await sha256(did);
    const key = getIdentityKey(id);

    try {
        const devices = await createDevices(currentDevice, key, storage);
        const backup = await createBackup(backupData, key, storage);
        const profile = await createProfile(schema, key, storage);

        await storage.set(key, { id, did }, { encrypt: true });

        return new Identity(id, did, devices, backup, profile);
    } catch (err) {
        await removeIdentity(id, storage);

        throw new UnableCreateIdentityError(err.message, err.code);
    }
};

export const restoreIdentity = async (key, storage) => {
    const { id, did } = await storage.get(key);

    assertIdentity(did);

    const devices = await restoreDevices(key, storage);
    const backup = await restoreBackup(key, storage);
    const profile = await restoreProfile(key, storage);

    return new Identity(id, did, devices, backup, profile);
};

export const removeIdentity = async (id, storage) => {
    const key = getIdentityKey(id);

    await removeDevices(key, storage);
    await removeBackup(key, storage);
    await removeProfile(key, storage);

    return storage.remove(key);
};
