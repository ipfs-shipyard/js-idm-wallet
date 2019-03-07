import passphrase from './passphrase';

const STORAGE_KEY_PREFIX = 'locker.lock';
const availableTypes = {
    passphrase,
};

const assertLockType = (type) => {
    if (!availableTypes[type]) {
        throw Object.assign(new Error('Unavailable lock type'), { code: 'UNAVAILABLE_TYPE' });
    }
};

const createLock = (type, { storage, secret, master }) => {
    assertLockType(type);

    if (type === 'passphrase') {
        return availableTypes[type](storage, secret, master, STORAGE_KEY_PREFIX);
    }
};

const isEnabled = async (type, { storage }) => {
    assertLockType(type);

    return storage.has(`${STORAGE_KEY_PREFIX}.${type}`);
};

export default createLock;
export { isEnabled };
