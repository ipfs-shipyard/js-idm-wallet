import { sha256 } from '../sha';
import * as mocks from './mocks';

beforeEach(() => {
    jest.clearAllMocks();
});

describe('sha256', () => {
    it('should hash correctly', async () => {
        mocks.mockTextEncoder();
        mocks.mockCrypto();

        await expect(sha256(mocks.mockData)).resolves.toEqual(mocks.mockDataSha256Hex);

        expect(mocks.mockDigest).toHaveBeenCalledTimes(1);
        expect(mocks.mockDigest).toHaveBeenCalledWith('SHA-256', mocks.mockDataEncoded);
    });
});
