import signal from 'pico-signals';
import { InvalidBackupPropertyError } from '../../utils/errors';

export const BAKCUP_KEY_PREFIX = 'backup!';

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

const getBackupKey = (identityKey) => `${BAKCUP_KEY_PREFIX}${identityKey}`;

export const assertBackupData = (data) => {
    const { mnemonic } = data;

    if (!mnemonic || typeof mnemonic !== 'string' || mnemonic.split(' ').length !== 12) {
        throw new InvalidBackupPropertyError('mnemonic', mnemonic);
    }
};

export const createBackup = async (data, identityKey, storage) => {
    const key = getBackupKey(identityKey);

    if (data != null) {
        assertBackupData(data);

        await storage.set(key, data, { encrypt: true });
    }

    return new Backup(data, key, storage);
};

export const restoreBackup = async (identityKey, storage) => {
    const key = getBackupKey(identityKey);

    const data = await storage.get(key);

    if (data != null) {
        assertBackupData(data);
    }

    return new Backup(data, key, storage);
};

export const removeBackup = async (identityKey, storage) => storage.remove(getBackupKey(identityKey));
