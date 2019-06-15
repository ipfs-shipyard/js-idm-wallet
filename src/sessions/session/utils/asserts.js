import { isPlainObject } from 'lodash';
import { InvalidSessionOptionsError } from '../../../utils/errors';

export const assertSessionOptions = (options) => {
    if (options && !isPlainObject(options)) {
        throw new InvalidSessionOptionsError();
    }
};
