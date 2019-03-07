import createStorage from '../';
import createLocalStorage from '../local-storage';

it('should return a local-storage based storage', async () => {
    const storage = await createStorage();
    const localStorage = await createLocalStorage();

    expect(storage.get).toBe(localStorage.get);
});

it('should throw if all storage types are unavailable', async () => {
    delete global.localStorage;

    expect.assertions(2);

    try {
        await createStorage();
    } catch (err) {
        expect(err.message).toBe('No compatible storage is available');
        expect(err.code).toBe('NO_STORAGE');
    }
});
