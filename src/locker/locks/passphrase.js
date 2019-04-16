import scrypt from 'scrypt-async';
import hexarray from 'hex-array';
import pify from 'pify';
import signal from 'pico-signals';
import BaseLock from './base';
import checkPassphraseStrength from './util/passphrase-strength';

const pScrypt = pify(scrypt, { errorFirst: false });

const STORAGE_KEY = 'locker.lock.passphrase';

class PassphraseLock extends BaseLock {
    #storage;
    #secret;

    #onEnabledChange = signal();

    constructor({ storage, secret, master }) {
        super({ master });

        this.#storage = storage;
        this.#secret = secret;
    }

    isMaster() {
        return super.isMaster();
    }

    async isEnabled() {
        return isEnabled(this.#storage);
    }

    async enable(passphrase) {
        await super.enable(passphrase);
        await this.#configure(passphrase);

        this.#onEnabledChange.dispatch(true);
    }

    async disable() {
        await super.disable();
        await this.#storage.remove(STORAGE_KEY);

        this.#onEnabledChange.dispatch(false);
    }

    onEnabledChange(fn) {
        return this.#onEnabledChange.add(fn);
    }

    async validate(passphrase) {
        const result = checkPassphraseStrength(passphrase);

        if (result.score < 0.5) {
            throw Object.assign(new Error('Passphrase is too weak'), {
                code: 'PASSPHRASE_TOO_WEAK',
                ...result,
            });
        }

        return result;
    }

    async update(newPassphrase, passphrase) {
        await super.update(newPassphrase, passphrase);
        await this.#configure(newPassphrase);
    }

    async unlock(input) {
        await super.unlock();

        // Read the previous saved stuff from the storage
        let { derivedKey, encryptedSecret } = await this.#storage.get(STORAGE_KEY);

        derivedKey = {
            ...derivedKey,
            salt: hexarray.fromString(derivedKey.salt),
        };

        encryptedSecret = {
            ...encryptedSecret,
            iv: hexarray.fromString(encryptedSecret.iv),
            cypherText: hexarray.fromString(encryptedSecret.cypherText),
        };

        // Re-derive the key from the passphrase with the same salt and params
        // Then, decrypt the locker secret with that derived key using AES-GCM
        // Because AES-GCM is authenticated, it will fail if the key is wrong (invalid passphrase)
        const key = await this.#rederiveKey(input, derivedKey.params, derivedKey.salt);

        let secret;

        try {
            secret = await this.#decryptSecret(encryptedSecret.cypherText, encryptedSecret.iv, key);
        } catch (err) {
            throw Object.assign(new Error('Passphrase is invalid'), { code: 'PASSPHRASE_MISMATCH' });
        }

        this.#secret.set(secret);
    }

    #configure = async (passphrase) => {
        const secret = this.#secret.get();

        // Derive a 256-bit key from the passphrase which will be used as the encryption key
        // Then, encrypt the locker secret with that derived key using AES-GCM
        const { key, salt, params } = await this.#deriveKey(passphrase);
        const { iv, cypherText } = await this.#encryptSecret(secret, key);

        // Finally store everything that we need to validate the passphrase in the future
        await this.#storage.set(STORAGE_KEY, {
            derivedKey: {
                algorithm: 'scrypt',
                params,
                salt: hexarray.toString(salt),
            },
            encryptedSecret: {
                algorithm: 'AES-GCM',
                iv: hexarray.toString(iv),
                cypherText: hexarray.toString(cypherText),
            },
        });
    }

    #deriveKey = async (passphrase) => {
        // Salt defaults to 128 bits which is more than enough
        const salt = crypto.getRandomValues(new Uint8Array(16));

        // Params recommended for interactive logins in 2017
        const params = { N: 32768, r: 8, p: 1 };

        // Convert the passphrase to bytes
        const password = new TextEncoder().encode(passphrase);

        const key = await pScrypt(password, salt, {
            ...params,
            dkLen: 32, // 256 bits
            encoding: 'binary',
        });

        return {
            key,
            salt,
            params,
        };
    }

    #rederiveKey = async (passphrase, params, salt) => {
        // Convert the passphrase to bytes
        const password = new TextEncoder().encode(passphrase);

        const key = await pScrypt(password, salt, {
            ...params,
            encoding: 'binary',
        });

        return key;
    }

    #encryptSecret = async (secret, key) => {
        const algorithm = {
            name: 'AES-GCM',
            // As per the AES publication, IV should be 12 bytes for GCM
            // See https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-38d.pdf, page 15
            iv: crypto.getRandomValues(new Uint8Array(12)),
        };

        const cryptoKey = await crypto.subtle.importKey('raw', key, algorithm.name, false, ['encrypt']);
        const cypherText = await crypto.subtle.encrypt(algorithm, cryptoKey, secret);

        return {
            iv: algorithm.iv,
            cypherText: new Uint8Array(cypherText),
        };
    }

    #decryptSecret = async (cypherText, iv, key) => {
        const algorithm = {
            name: 'AES-GCM',
            iv,
        };

        const cryptoKey = await crypto.subtle.importKey('raw', key, algorithm.name, false, ['decrypt']);
        const secret = await crypto.subtle.decrypt(algorithm, cryptoKey, cypherText);

        return new Uint8Array(secret);
    }
}

const isEnabled = async (storage) => storage.has(STORAGE_KEY);

const createPassphraseLock = (storage, secret, master) =>
    new PassphraseLock({ storage, secret, master });

export default createPassphraseLock;
export { isEnabled };
