import BaseError from '../base';

export class InvalidBackupPropertyError extends BaseError {
    constructor(property, value) {
        super(`Invalid backup ${property}: ${value}`, 'INVALID_BACKUP_PROPERTY');
    }
}
