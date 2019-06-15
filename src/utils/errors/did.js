import BaseError from './base';

export class InvalidDidError extends BaseError {
    constructor(message) {
        super(message, 'INVALID_DID');
    }
}

export class InvalidDidUrlError extends BaseError {
    constructor(message) {
        super(message, 'INVALID_DID_URL');
    }
}

export class InvalidDidParts extends BaseError {
    constructor(message) {
        super(message, 'INVALID_DID_PARTS');
    }
}
