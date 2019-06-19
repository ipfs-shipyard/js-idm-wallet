import BaseError from '../base';

export * from './profile';
export * from './devices';
export * from './backup';
export * from './apps';

export class IdentityRevokedError extends BaseError {
    constructor(message) {
        super(message, 'IDENTITY_REVOKED');
    }
}

export class InvalidIdentityPropertyError extends BaseError {
    constructor(property, value) {
        super(`Invalid identity ${property}: ${value}`, 'INVALID_IDENTITY_PROPERTY');
    }
}
