import BaseError from '../base';

export * from './profile';
export * from './devices';
export * from './backup';
export * from './apps';

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
