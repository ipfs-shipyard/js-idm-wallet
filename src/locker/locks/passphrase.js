import scrypt from 'scrypt-async';
import hexarray from 'hex-array';
import pify from 'pify';
import signal from 'pico-signals';
import checkPassphraseStrength from './utils/passphrase-strength';
import { assertDisabled, assertEnabled, assertNotMaster } from './utils/asserts';
import { encrypt, decrypt, getRandomBytes } from '../../utils/crypto';
import { LockValidationError, UnlockMismatchError } from '../../utils/errors';

const pScrypt = pify(scrypt, { errorFirst: false });

const STORAGE_KEY = 'locker.lock.passphrase';

class PassphraseLock {
    #storage;
    #secret;
    #master;
    #enabled;

    #onEnabledChange = signal();

    constructor(storage, secret, masterLockType, enabled) {
        this.#storage = storage;
        this.#secret = secret;
        this.#master = masterLockType === this.getType();
        this.#enabled = !!enabled;
    }

    getType() {
        return 'passphrase';
    }

    isMaster() {
        return this.#master;
    }

    isEnabled() {
        return this.#enabled;
    }

    onEnabledChange(fn) {
        return this.#onEnabledChange.add(fn);
    }

    async enable(passphrase) {
        assertDisabled(this.#enabled);

        await this.validate(passphrase);
        await this.#configure(passphrase);

        this.#dispatchEnabledChange(true);
    }

    async disable() {
        assertEnabled(this.#enabled);
        assertNotMaster(this.#master);

        await this.#storage.remove(STORAGE_KEY);

        this.#dispatchEnabledChange(false);
    }

    async validate(passphrase) {
        const result = checkPassphraseStrength(passphrase);

        if (result.score < 0.5) {
            throw new LockValidationError('Passphrase is too weak', result);
        }

        return result;
    }

    async update(newPassphrase, passphrase) {
        assertEnabled(this.#enabled);

        await this.validate(newPassphrase);

        // Be sure that the user is able to unlock if this is the master lock
        if (this.#master) {
            await this.unlock(passphrase);
        }

        await this.#configure(newPassphrase);
    }

    async unlock(input) {
        assertEnabled(this.#enabled);

        // Read the previous saved stuff from the storage
        const { keyDerivation, encryptedSecret } = await this.#storage.get(STORAGE_KEY);

        // Re-derive the key from the passphrase with the same salt and params
        // Then, decrypt the locker secret with that derived key using AES-GCM
        // Because AES-GCM is authenticated, it will fail if the key is wrong (invalid passphrase)
        const key = await this.#rederiveKey(input, keyDerivation);

        let secret;

        try {
            secret = await decrypt(encryptedSecret, key);
        } catch (err) {
            throw new UnlockMismatchError('Passphrase is invalid');
        }

        this.#secret.set(secret);
    }

    #configure = async (passphrase) => {
        const secret = await this.#secret.getAsync();

        // Derive a 256-bit key from the passphrase which will be used as the encryption key
        // Then, encrypt the locker secret with that derived key using AES-GCM
        const { key, keyDerivation } = await this.#deriveKey(passphrase);
        const encryptedSecret = await encrypt(secret, key, true);

        // Finally store everything that we need to validate the passphrase in the future
        await this.#storage.set(STORAGE_KEY, {
            keyDerivation,
            encryptedSecret,
        });
    }

    #deriveKey = async (passphrase) => {
        // Salt defaults to 128 bits which is more than enough
        const salt = getRandomBytes(128 / 8);

        // Params recommended for interactive logins in 2017
        const params = { N: 32768, r: 8, p: 1 };

        const password = new TextEncoder().encode(passphrase);

        const key = await pScrypt(password, salt, {
            ...params,
            dkLen: 32, // 256 bits
            encoding: 'binary',
        });

        return {
            key,
            keyDerivation: {
                algorithm: 'scrypt',
                salt: hexarray.toString(salt, { uppercase: false }),
                params,
            },
        };
    }

    #rederiveKey = async (passphrase, keyDerivation) => {
        const salt = hexarray.fromString(keyDerivation.salt);

        const password = new TextEncoder().encode(passphrase);

        const key = await pScrypt(password, salt, {
            ...keyDerivation.params,
            encoding: 'binary',
        });

        return key;
    }

    #dispatchEnabledChange = (enabled) => {
        this.#enabled = enabled;
        this.#onEnabledChange.dispatch(enabled);
    }
}

const createPassphraseLock = async (storage, secret, masterLockType) => {
    const enabled = await storage.has(STORAGE_KEY);

    return new PassphraseLock(storage, secret, masterLockType, enabled);
};

export default createPassphraseLock;
