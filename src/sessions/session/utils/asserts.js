import { isPlainObject } from 'lodash';
import { InvalidSessionOptionsError } from '../../../utils/errors';

export const assertSessionOptions = (options) => {
    if (typeof options !== 'undefined' && !isPlainObject(options)) {
        throw new InvalidSessionOptionsError();
    }
};
