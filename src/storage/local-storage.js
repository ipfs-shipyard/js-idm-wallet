class LocalStorage {
    async has(key) {
        return localStorage.getItem(key) != null;
    }

    async get(key) {
        const value = localStorage.getItem(key);

        return value != null ? JSON.parse(value) : value;
    }

    async set(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    async remove(key) {
        localStorage.removeItem(key);
    }

    async clear() {
        localStorage.clear();
    }
}

export const isSupported = () => {
    if (typeof localStorage === 'undefined') {
        return false;
    }

    const key = '__IDM_WALLET_TEST__';

    try {
        localStorage.setItem(key, '1');

        if (localStorage.getItem(key) !== '1') {
            return false;
        }

        localStorage.removeItem(key);
    } catch (err) {
        return false;
    }

    return true;
};

const createLocalStorage = () => new LocalStorage();

export default createLocalStorage;
