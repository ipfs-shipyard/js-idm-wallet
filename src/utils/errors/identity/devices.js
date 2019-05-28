import BaseError from '../base';

export class InvalidDevicePropertyError extends BaseError {
    constructor(property, value) {
        super(`Invalid device ${property}: ${value}`, 'INVALID_DEVICE_PROPERTY');
    }
}

export class UnknownDeviceError extends BaseError {
    constructor(id) {
        super(`Unknown device with id: ${id}`, 'UNKNOWN_DEVICE');
    }
}

export class InvalidDeviceOperationError extends BaseError {
    constructor(msg) {
        super(msg, 'INVALID_DEVICE_OPERATION');
    }
}

export class UnsupportedDeviceInfoPropertyError extends BaseError {
    constructor(property) {
        super(`Property ${property} is not supported`, 'UNSUPPORTED_DEVICE_INFO_PROPERTY');
    }
}
