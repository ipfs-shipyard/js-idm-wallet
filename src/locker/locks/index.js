import * as passphrase from './passphrase';

const availableTypes = {
    passphrase: {
        create: ({ storage, secret, master }) => passphrase.default(storage, secret, master),
        isEnabled: ({ storage }) => passphrase.isEnabled(storage),
    },
};

const assertLockType = (type) => {
    if (!availableTypes[type]) {
        throw Object.assign(new Error('Unavailable lock type'), { code: 'UNAVAILABLE_TYPE' });
    }
};

const createLock = (type, params) => {
    assertLockType(type);

    const { create } = availableTypes[type];

    return create(params);
};

const isEnabled = async (type, params) => {
    assertLockType(type);

    const { isEnabled } = availableTypes[type];

    return isEnabled(params);
};

export default createLock;
export { isEnabled };
