import createStorage from './storage';
import createLocker from './locker';

const createWallet = async () => {
    const storage = await createStorage();
    const locker = await createLocker(storage);

    return {
        storage,
        locker,
    };
};

export default createWallet;
