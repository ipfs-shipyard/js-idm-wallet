import level from 'level';
import pify from 'pify';
import pMap from 'p-map';
import { encrypt, decrypt, isEncrypted } from '../utils/crypto';
import { StorageError } from '../utils/errors';

const createLevelDb = pify(level);
const DB_NAME = 'idm-wallet-db';

class Storage {
    #db;
    #secret;

    constructor(db, secret) {
        this.#db = db;
        this.#secret = secret;
    }

    async has(key) {
        let value;

        try {
            value = await this.#db.get(key);
        } catch (err) {
            if (err.type === 'NotFoundError') {
                return false;
            }

            throw err;
        }

        return value != null;
    }

    async get(key) {
        try {
            let value = await this.#db.get(key);

            value = await this.#maybeDecrypt(value);

            return JSON.parse(value);
        } catch (err) {
            if (err.type === 'NotFoundError') {
                return undefined;
            }

            throw new StorageError(err.message, 'get', err.type);
        }
    }

    async set(key, value, options) {
        const { encrypt } = { ...options };

        try {
            value = JSON.stringify(value);

            if (encrypt) {
                const secret = await this.#secret.getAsync();

                value = await this.#encrypt(value, secret);
            }

            await this.#db.put(key, value);
        } catch (err) {
            throw new StorageError(err.message, 'set', err.type);
        }
    }

    async remove(key) {
        try {
            await this.#db.del(key);
        } catch (err) {
            throw new StorageError(err.message, 'remove', err.type);
        }
    }

    async clear() {
        try {
            const keys = await this.#readStream({ values: false });
            const ops = keys.map((key) => ({ type: 'del', key }));

            await this.#db.batch(ops);
        } catch (err) {
            throw new StorageError(err.message, 'clear', err.type);
        }
    }

    async list(options) {
        try {
            const result = await this.#readStream(options);

            return result;
        } catch (err) {
            throw new StorageError(err.message, 'list', err.type);
        }
    }

    #readStream = async (options) => {
        options = {
            keys: true,
            values: true,
            ...options,
        };

        const result = await new Promise((resolve, reject) => {
            const result = [];

            this.#db.createReadStream(options)
            .on('data', (data) => result.push(data))
            .on('end', () => resolve(result))
            .on('error', reject);
        });

        const finalResult = await pMap(result, async (data) => {
            if (options.values) {
                if (options.keys) {
                    data.value = await this.#maybeDecrypt(data.value);
                    data.value = JSON.parse(data.value);
                } else {
                    data = await this.#maybeDecrypt(data);
                    data = JSON.parse(data);
                }
            }

            return data;
        });

        return finalResult;
    };

    #encrypt = async (value, key) => {
        const valueUint8Array = new TextEncoder().encode(value);
        const encryptedValue = await encrypt(valueUint8Array, key, true);

        return JSON.stringify(encryptedValue);
    };

    #decrypt = async (encryptedValue, key) => {
        const decryptedValueUint8Array = await decrypt(encryptedValue, key);
        const decryptedValue = new TextDecoder().decode(decryptedValueUint8Array);

        return decryptedValue;
    };

    #maybeDecrypt = async (value) => {
        const decodedValue = JSON.parse(value);

        if (!isEncrypted(decodedValue)) {
            return value;
        }

        const secret = await this.#secret.getAsync();
        const decryptedValue = await this.#decrypt(decodedValue, secret);

        return decryptedValue;
    }
}

const createStorage = async (secret) => {
    const db = await createLevelDb(DB_NAME, {});

    return new Storage(db, secret);
};

export default createStorage;
