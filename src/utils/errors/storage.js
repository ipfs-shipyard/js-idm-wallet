import BaseError from './base';

export class StorageError extends BaseError {
    constructor(message, operation, type) {
        message = message || 'Something went wrong during storage operations';

        super(message, 'STORAGE_OPERATION', { operation, type });
    }
}
