import createLocalStorage, { isSupported as isLocalStorageSupported } from './local-storage';
import { UnavailableStorageError } from '../utils/errors';

const createStorage = async () => {
    if (isLocalStorageSupported()) {
        return createLocalStorage();
    }

    throw new UnavailableStorageError();
};

export default createStorage;
