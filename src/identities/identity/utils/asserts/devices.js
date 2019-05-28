import { DEVICE_TYPES } from '../constants/devices';
import { InvalidDevicePropertyError, UnsupportedDeviceInfoPropertyError } from '../../../../utils/errors';

export const assertDeviceInfo = (deviceInfo) => {
    const { type, name, ...rest } = deviceInfo || {};

    if (!DEVICE_TYPES.includes(type)) {
        throw new InvalidDevicePropertyError('type', type);
    }

    if (!name || typeof name !== 'string') {
        throw new InvalidDevicePropertyError('name', name);
    }

    const otherProps = Object.keys(rest);

    if (otherProps.length) {
        throw new UnsupportedDeviceInfoPropertyError(otherProps[0]);
    }
};

