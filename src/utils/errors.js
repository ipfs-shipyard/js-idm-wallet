class BaseError extends Error {
    constructor(message, code, props) {
        super(message);

        Error.captureStackTrace(this, this.constructor);

        Object.assign(this, { code, ...props });
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

export class UnavailableStorageError extends BaseError {
    constructor() {
        super('No compatible storage is available', 'NO_STORAGE');
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
