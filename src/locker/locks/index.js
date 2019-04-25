import pProps from 'p-props';
import createPassphrase from './passphrase';

const createLocks = async (storage, secret, masterLockType = 'passphrase') => {
    const passphrase = createPassphrase(storage, secret, masterLockType === 'passphrase');

    return pProps({
        passphrase,
    });
};

export default createLocks;
