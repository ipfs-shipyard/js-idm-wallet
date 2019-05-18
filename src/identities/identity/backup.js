import signal from 'pico-signals';
import { InvalidBackupPropertyError } from '../../utils/errors';
import { getBackupKey } from './utils/storage-keys';

class Backup {
    #data
    #key
    #storage

    #onComplete = signal();

    constructor(data, key, storage) {
        this.#data = data;
        this.#key = key;
        this.#storage = storage;
    }

    isComplete() {
        return !this.#data;
    }

    getData() {
        return this.#data;
    }

    async setComplete() {
        if (this.isComplete()) {
            return;
        }

        await this.#storage.remove(this.#key);

        this.#data = undefined;
        this.#onComplete.dispatch();
    }

    onComplete(fn) {
        return this.#onComplete.add(fn);
    }
}

export const assertBackupData = (data) => {
    const { mnemonic } = data;

    if (!mnemonic || typeof mnemonic !== 'string' || mnemonic.split(' ').length !== 12) {
        throw new InvalidBackupPropertyError('mnemonic', mnemonic);
    }
};

export const createBackup = async (data, identityDescriptor, storage) => {
    const key = getBackupKey(identityDescriptor.id);

    if (data != null) {
        assertBackupData(data);

        await storage.set(key, data, { encrypt: true });
    }

    return new Backup(data, key, storage);
};

export const restoreBackup = async (identityDescriptor, storage) => {
    const key = getBackupKey(identityDescriptor.id);
    const data = await storage.get(key);

    return new Backup(data, key, storage);
};

export const removeBackup = async (identityDescriptor, storage) => storage.remove(getBackupKey(identityDescriptor.id));
