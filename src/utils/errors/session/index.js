import BaseError from '../base';

export class InvalidSessionOptionsError extends BaseError {
    constructor() {
        super('Session options must be a plain object', 'INVALID_SESSION_OPTIONS');
    }
}
