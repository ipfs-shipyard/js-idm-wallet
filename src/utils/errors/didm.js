import BaseError from './base';

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

export class MissingDidParameters extends BaseError {
    constructor(message) {
        super(message, 'MISSING_DID_PARAMETERS');
    }
}
