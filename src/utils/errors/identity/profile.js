import BaseError from '../base';

export class InvalidProfilePropertyError extends BaseError {
    constructor(property, value) {
        super(`Invalid profile ${property}: ${value}`, 'INVALID_PROFILE_PROPERTY');
    }
}

export class InvalidProfileMandatoryPropertyError extends BaseError {
    constructor(property) {
        super(`Invalid operation with mandatory profile property: ${property}`, 'INVALID_OPERATION_MANADATORY_PROPERTY');
    }
}

export class UnsupportedProfilePropertyError extends BaseError {
    constructor(property) {
        super(`Property ${property} is not supported`, 'UNSUPPORTED_PROFILE_PROPERTY');
    }
}

export class ProfileReplicationTimeoutError extends BaseError {
    constructor() {
        super('Profile replication timed out', 'PROFILE_REPLICATION_TIMEOUT');
    }
}

export class InfuraHashMismatch extends BaseError {
    constructor(infuraHash, expectedHash) {
        super(`Expecting infura response hash to be "${expectedHash}" but got "${infuraHash} instead`, 'INFURA_HASH_MISMATCH');
    }
}
