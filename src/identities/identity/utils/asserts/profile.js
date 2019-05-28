import { isPlainObject } from 'lodash';
import { PROFILE_TYPES, PROFILE_MANDATORY_PROPERTIES } from '../constants/profile';
import {
    InvalidProfilePropertyError,
    UnsupportedProfilePropertyError,
    InvalidProfileMandatoryPropertyError,
} from '../../../../utils/errors';

export const assertProfileProperty = (key, value) => {
    switch (key) {
    case '@context':
        if (value !== 'https://schema.org') {
            throw new InvalidProfilePropertyError(key, value);
        }
        break;
    case '@type':
        if (!PROFILE_TYPES.includes(value)) {
            throw new InvalidProfilePropertyError(key, value);
        }
        break;
    case 'name':
        if (typeof value !== 'string' || !value.trim()) {
            throw new InvalidProfilePropertyError(key, value);
        }
        break;
    case 'image': {
        if (!isPlainObject(value)) {
            throw new InvalidProfilePropertyError(key, value);
        }

        const { type, data, ...rest } = value;

        if (typeof type !== 'string') {
            throw new InvalidProfilePropertyError(`${key}.type`, type);
        }

        const typeParts = type.split('/');

        if (typeParts.length !== 2 || typeParts[0] !== 'image') {
            throw new InvalidProfilePropertyError(`${key}.type`, type);
        }

        if (!(data instanceof ArrayBuffer)) {
            throw new InvalidProfilePropertyError(`${key}.data`, data);
        }

        const otherProps = Object.keys(rest);

        if (otherProps.length) {
            throw new UnsupportedProfilePropertyError(`${key}.${otherProps[0]}`);
        }
        break;
    }
    case 'gender': {
        if (!['Male', 'Female', 'Other'].includes(value)) {
            throw new InvalidProfilePropertyError(key, value);
        }
        break;
    }
    case 'nationality':
    case 'address': {
        if (typeof value !== 'string' || !value.trim()) {
            throw new InvalidProfilePropertyError(key, value);
        }
        break;
    }
    default:
        throw new UnsupportedProfilePropertyError(key);
    }
};

export const assertProfileDetails = (details) => {
    PROFILE_MANDATORY_PROPERTIES.forEach((property) => {
        const value = details && details[property];

        if (value === undefined) {
            throw new InvalidProfilePropertyError(property, value);
        }
    });

    Object.entries(details).forEach(([key, value]) => assertProfileProperty(key, value));
};

export const assertNonMandatoryProfileProperty = (key) => {
    if (PROFILE_MANDATORY_PROPERTIES.includes(key)) {
        throw new InvalidProfileMandatoryPropertyError(key);
    }
};
