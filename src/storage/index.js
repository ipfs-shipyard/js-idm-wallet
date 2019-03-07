import createLocalStorage, { isSupported as isLocalStorageSupported } from './local-storage';

const createStorage = async () => {
    if (isLocalStorageSupported()) {
        return createLocalStorage();
    }

    throw Object.assign(new Error('No compatible storage is available'), { code: 'NO_STORAGE' });
};

export default createStorage;
