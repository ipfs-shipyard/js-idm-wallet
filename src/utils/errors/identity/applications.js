import BaseError from '../base';

export class UnknownAppError extends BaseError {
    constructor(appId) {
        super(`Unknown app with id: ${appId}`, 'UNKNOWN_APPLICAITON');
    }
}

export class InvalidAppPropertyError extends BaseError {
    constructor(property, value) {
        super(`Invalid application ${property}: ${value}`, 'INVALID_APPLICATION_PROPERTY');
    }
}
