import BaseError from './base';

export * from './identity';

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
