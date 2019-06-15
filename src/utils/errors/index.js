import BaseError from './base';

export * from './didm';
export * from './identities';
export * from './locker';
export * from './storage';
export * from './sessions';
export * from './crypto';

export class UnavailableIpfsError extends BaseError {
    constructor() {
        super('IPFS node is unavailable', 'IPFS_UNAVAILABLE');
    }
}

export class InvalidMasterLockOperationError extends BaseError {
    constructor() {
        super('Invalid master lock operation', 'INVALID_MASTER_OPERATION');
    }
}
