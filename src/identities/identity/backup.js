import signal from 'pico-signals';
import { getBackupKey } from './utils/storage-keys';

class Backup {
    #data;
    #identityDescriptor;
    #storage;

    #onComplete = signal();

    constructor(data, identityDescriptor, storage) {
        window.backup = this;
        this.#data = data;
        this.#identityDescriptor = identityDescriptor;
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

        await this.#storage.remove(getBackupKey(this.#identityDescriptor.id));

        this.#data = undefined;
        this.#onComplete.dispatch();
    }

    onComplete(fn) {
        return this.#onComplete.add(fn);
    }
}

export const createBackup = async (data, identityDescriptor, storage) => {
    if (data) {
        await storage.set(getBackupKey(identityDescriptor.id), data, { encrypt: true });
    }

    return new Backup(data, identityDescriptor, storage);
};

export const restoreBackup = async (identityDescriptor, storage) => {
    const data = await storage.get(getBackupKey(identityDescriptor.id));

    return new Backup(data, identityDescriptor, storage);
};

export const removeBackup = async (identityDescriptor, storage) => {
    storage.remove(getBackupKey(identityDescriptor.id));
};
