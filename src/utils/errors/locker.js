import BaseError from './base';

export * from './locks';

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

export class UnknownLockTypeError extends BaseError {
    constructor(lockType) {
        super(`There's no lock of type \`${lockType}\``, 'UNKNOWN_LOCK_TYPE');
    }
}
