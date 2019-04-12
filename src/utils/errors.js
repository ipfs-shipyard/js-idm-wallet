class BaseError extends Error {
    constructor(message, code) {
        super(message);

        Error.captureStackTrace(this, this.constructor);

        Object.assign(this, { code });
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
