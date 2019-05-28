import BaseError from './base';

export * from './session';

export class UnknownSessionError extends BaseError {
    constructor(sessionId) {
        super(`Unknown session with: ${sessionId}`, 'UNKNOWN_SESSION');
    }
}
