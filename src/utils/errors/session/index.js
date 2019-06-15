import BaseError from '../base';

export class InvalidSessionOptionsError extends BaseError {
    constructor() {
        super('Session options must be a plain object', 'INVALID_SESSION_OPTIONS');
    }
}

export class CreateSessionRevokedIdentityError extends BaseError {
    constructor(identityId) {
        super(`Unable to create session for revoked identity: ${identityId}`, 'CREATE_SESSION_REVOKED_IDENTITY');
    }
}
