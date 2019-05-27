import BaseError from '../base';

export class InvalidProfilePropertyError extends BaseError {
    constructor(property, value) {
        super(`Invalid profile ${property}: ${value}`, 'INVALID_PROFILE_PROPERTY');
    }
}

export class InvalidProfileUnsetPropertyError extends BaseError {
    constructor(property) {
        super(`Cannot remove property from profile: ${property}`, 'INVALID_UNSET_PROFILE_PROPERTY');
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
