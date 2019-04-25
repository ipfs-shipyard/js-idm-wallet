import pProps from 'p-props';
import createPassphrase from './passphrase';

const createLocks = async (storage, secret, master = 'passphrase') => {
    const passphrase = createPassphrase({
        storage,
        secret,
        master: master === 'passphrase',
    });

    return pProps({
        passphrase,
    });
};

export default createLocks;
