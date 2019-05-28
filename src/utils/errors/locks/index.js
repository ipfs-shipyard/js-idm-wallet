import BaseError from '../base';

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
