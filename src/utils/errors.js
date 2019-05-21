class BaseError extends Error {
    constructor(message, code, props) {
        super(message);

        Object.assign(this, {
            ...props,
            code,
            name: this.constructor.name,
        });

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);

            return;
        }

        this.stack = (new Error(message)).stack;
    }
}

export class UnsupportedDidMethodError extends BaseError {
    constructor(didMethod) {
        super(`Did method \`${didMethod}\` is not supported`, 'UNSUPPORTED_DID_METHOD');
    }
}

export class UnsupportedDidMethodPurposeError extends BaseError {
    constructor(didMethod, purpose) {
        super(`Purpose \`${purpose}\` is not currently supported for \`${didMethod}\``, 'UNSUPPORTED_DID_METHOD_PURPOSE');
    }
}

export class InvalidDidError extends BaseError {
    constructor(did) {
        super(`Invalid DID: ${did}`, 'INVALID_DID');
    }
}

export class UnavailableIpfsError extends BaseError {
    constructor() {
        super('IPFS node is unavailable.', 'IPFS_UNAVAILABLE');
    }
}

export class LockerLockedError extends BaseError {
    constructor() {
        super('Locker is locked', 'LOCKED');
    }
}

export class PristineError extends BaseError {
    constructor() {
        super('Can\'t lock until you configure the master lock', 'IS_PRISTINE');
    }
}

export class LockValidationError extends BaseError {
    constructor(message, props) {
        message = message || 'Lock validation unsuccessful';

        super(message, 'LOCK_VALIDATION', props);
    }
}

export class UnlockMismatchError extends BaseError {
    constructor(message) {
        message = message || 'Provided input is invalid';

        super(message, 'UNLOCK_INPUT_MISMATCH');
    }
}

export class StorageError extends BaseError {
    constructor(message, operation, type) {
        message = message || 'Something went wrong during storage operations';

        super(message, 'STORAGE_OPERATION', { operation, type });
    }
}

export class UnknownLockTypeError extends BaseError {
    constructor(lockType) {
        super(`There's no lock of type \`${lockType}\``, 'UNKNOWN_LOCK_TYPE');
    }
}

export class InvalidMasterLockOperationError extends BaseError {
    constructor() {
        super('Invalid master lock operation', 'INVALID_MASTER_OPERATION');
    }
}

export class LockEnabledError extends BaseError {
    constructor() {
        super('Lock must be disabled', 'LOCK_NOT_DISABLED');
    }
}

export class LockDisabledError extends BaseError {
    constructor() {
        super('Lock must be enabled', 'LOCK_NOT_ENABLED');
    }
}

export class IdentitiesNotLoadedError extends BaseError {
    constructor() {
        super('Identites are still not loaded', 'IDENTITIES_NOT_LOADED');
    }
}

export class UnknownIdentityError extends BaseError {
    constructor(did) {
        super(`Unknown identity with: ${did}`, 'UNKNOWN_IDENTITY');
    }
}

export class IdentityAlreadyExistsError extends BaseError {
    constructor(did) {
        super(`Identity with the following did already exists: ${did}`, 'IDENTITY_ALREADY_EXISTS');
    }
}

export class InvalidIdentityPropertyError extends BaseError {
    constructor(property, value) {
        super(`Invalid identity ${property}: ${value}`, 'INVALID_IDENTITY_PROPERTY');
    }
}

export class UnableCreateIdentityError extends BaseError {
    constructor(originalMessage, originalCode) {
        super(`Unable to create identity: "${originalMessage}"`, 'UNABLE_CREATE_IDENTITY', { originalCode });
    }
}

export class InvalidBackupPropertyError extends BaseError {
    constructor(property, value) {
        super(`Invalid backup ${property}: ${value}`, 'INVALID_BACKUP_PROPERTY');
    }
}

export class InvalidDevicePropertyError extends BaseError {
    constructor(property, value) {
        super(`Invalid device ${property}: ${value}`, 'INVALID_DEVICE_PROPERTY');
    }
}

export class UnknownDeviceError extends BaseError {
    constructor(id) {
        super(`Unknown device with: ${id}`, 'UNKNOWN_DEVICE');
    }
}

export class InvalidDeviceOperationError extends BaseError {
    constructor(msg) {
        super(msg, 'INVALID_DEVICE_OPERATION');
    }
}

export class InvalidProfilePropertyError extends BaseError {
    constructor(property, value) {
        super(`Invalid profile ${property}: ${value}`, 'INVALID_PROFILE_PROPERTY');
    }
}

export class InvalidProfileUnsetPropertyError extends BaseError {
    constructor(property) {
        super(`Cannot remove property from profile: ${property}`, 'INVALID_UNSET_PROFILE_PROPERTY');
    }
}

export class ProfileReplicationTimeoutError extends BaseError {
    constructor() {
        super('Profile schema replication timed out', 'PROFILE_REPLICATION_TIMEOUT');
    }
}
