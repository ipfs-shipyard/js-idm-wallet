import { encrypt, decrypt } from '../aes-gcm';
import * as mocks from './mocks';

beforeEach(() => {
    jest.clearAllMocks();
});

describe('encrypt', () => {
    it('should encrypt successfully', async () => {
        mocks.mockCrypto();

        await expect(encrypt(mocks.mockDataEncoded, mocks.mockKey)).resolves.toEqual({
            algorithm: 'AES-GCM',
            cypherText: mocks.mockEncryption,
            iv: mocks.mockRandomValues,
        });

        expect(mocks.mockImportKey).toHaveBeenCalledTimes(1);
        expect(mocks.mockImportKey).toHaveBeenCalledWith('raw', mocks.mockKey, 'AES-GCM', false, ['encrypt']);

        expect(mocks.mockEncrypt).toHaveBeenCalledTimes(1);
        expect(mocks.mockEncrypt).toHaveBeenCalledWith(
            { name: 'AES-GCM', iv: mocks.mockRandomValues },
            'imporKeyResult',
            mocks.mockDataEncoded
        );
    });
});

describe('decrypt', () => {
    it('should decrypt successfully', async () => {
        mocks.mockCrypto();

        await expect(decrypt(mocks.mockEncryption, mocks.mockRandomValues, mocks.mockKey)).resolves.toEqual(mocks.mockDataEncoded);

        expect(mocks.mockImportKey).toHaveBeenCalledTimes(1);
        expect(mocks.mockImportKey).toHaveBeenCalledWith('raw', mocks.mockKey, 'AES-GCM', false, ['decrypt']);

        expect(mocks.mockDecrypt).toHaveBeenCalledTimes(1);
        expect(mocks.mockDecrypt).toHaveBeenCalledWith(
            { name: 'AES-GCM', iv: mocks.mockRandomValues },
            'imporKeyResult',
            mocks.mockEncryption
        );
    });
});
