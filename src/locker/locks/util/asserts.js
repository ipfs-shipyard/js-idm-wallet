import { InvalidMasterLockOperationError, LockEnabledError, LockDisabledError } from '../../../utils/errors';

export const assertNotMaster = (master) => {
    if (master) {
        throw new InvalidMasterLockOperationError();
    }
};

export const assertEnabled = (enabled) => {
    if (!enabled) {
        throw new LockDisabledError();
    }
};

export const assertDisabled = (enabled) => {
    if (enabled) {
        throw new LockEnabledError();
    }
};
