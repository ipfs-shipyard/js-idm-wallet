import pProps from 'p-props';
import createPassphrase, { isEnabled as isPassphraseEnabled } from './passphrase';

const types = {
    passphrase: {
        create: createPassphrase,
        isEnabled: isPassphraseEnabled,
    },
};

const createLocks = async (storage, secret, master = 'passphrase') => {
    const enabled = await pProps({
        passphrase: types.passphrase.isEnabled(storage),
    });

    return {
        passphrase: createPassphrase({
            storage,
            secret,
            master: master === 'passphrase',
            enabled: !!enabled.passphrase,
        }),
    };
};

export default createLocks;
