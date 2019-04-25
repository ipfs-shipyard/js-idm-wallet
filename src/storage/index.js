import level from 'level';
import pify from 'pify';
import pMap from 'p-map';
import hexarray from 'hex-array';
import { encrypt, decrypt } from '../utils/aes-gcm';
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

            value = JSON.parse(value);

            return this.#maybeDecrypt(value);
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
            if (encrypt) {
                value = await this.#encrypt(value, this.#secret.get());
            }

            value = JSON.stringify(value);

            await this.#db.put(key, value);

            return { key, value };
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
            let result = await this.#readStream(options);

            result = await pMap(result, async (data) => {
                if (data.value) {
                    data.value = await this.#maybeDecrypt(data.value);
                } else {
                    data = await this.#maybeDecrypt(data);
                }

                return data;
            });

            return result;
        } catch (err) {
            throw new StorageError(err.message, 'list', err.type);
        }
    }

    #readStream = (options) => new Promise((resolve, reject) => {
        const result = [];

        options = {
            keys: true,
            values: true,
            ...options,
        };

        this.#db.createReadStream(options)
        .on('data', (data) => {
            if (options.values) {
                if (options.keys) {
                    data.value = JSON.parse(data.value);
                } else {
                    data = JSON.parse(data);
                }
            }

            result.push(data);
        })
        .on('end', () => resolve(result))
        .on('error', reject);
    });

    #isEncrypted = (value) =>
        !!(typeof value === 'object' && value.iv && value.cypherText);

    #encrypt = async (value, key) => {
        value = typeof value === 'string' ? value : JSON.stringify(value);
        value = new TextEncoder().encode(value);

        const { iv, cypherText, ...rest } = await encrypt(value, key);

        return {
            ...rest,
            iv: hexarray.toString(iv),
            cypherText: hexarray.toString(cypherText),
        };
    };

    #decrypt = async (cypherText, iv, key) => {
        cypherText = hexarray.fromString(cypherText);
        iv = hexarray.fromString(iv);

        const decryptedValue = await decrypt(cypherText, iv, key);
        const decodedValue = new TextDecoder().decode(decryptedValue);

        return decodedValue;
    };

    #maybeDecrypt = async (value) => {
        if (!this.#isEncrypted(value)) {
            return value;
        }

        value = await this.#decrypt(value.cypherText, value.iv, this.#secret.get());

        return JSON.parse(value);
    }
}

const createStorage = async (secret) => {
    const db = await createLevelDb(DB_NAME, {});

    return new Storage(db, secret);
};

export default createStorage;
