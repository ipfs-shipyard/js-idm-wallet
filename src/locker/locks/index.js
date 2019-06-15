import createPassphrase from './passphrase';

const createLocks = async (storage, secret, masterLockType) => {
    const locks = await Promise.all([
        createPassphrase(storage, secret, masterLockType),
    ]);

    return locks.reduce((acc, lock) => {
        acc[lock.getType()] = lock;

        return acc;
    }, {});
};

export default createLocks;
