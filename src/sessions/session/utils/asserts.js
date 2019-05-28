import { isPlainObject } from 'lodash';
import { InvalidSessionOptionsError } from '../../../utils/errors';

export const assertSessionOptions = (options) => {
    if (!isPlainObject(options)) {
        throw new InvalidSessionOptionsError();
    }
};
