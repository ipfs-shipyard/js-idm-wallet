export const mockData = 'foobar';

export const mockDataEncoded = new Uint8Array([102, 111, 111, 98, 97, 114]);

export const mockDataSha256Bytes = new Uint8Array([195, 171, 143, 241, 55, 32, 232, 173, 144, 71, 221, 57, 70, 107, 60, 137, 116, 229, 146, 194, 250, 56, 61, 74, 57, 96, 113, 76, 174, 240, 196, 242]);

export const mockDataSha256Hex = 'c3ab8ff13720e8ad9047dd39466b3c8974e592c2fa383d4a3960714caef0c4f2';

export const mockKey = new Uint8Array([167, 112, 73, 173, 25, 22, 164, 101, 52, 73, 60, 122, 49, 243, 101, 83, 68, 175, 86, 11, 77, 209, 70, 21, 102, 62, 205, 172, 76, 3, 207, 42]);

export const mockRandomValues = new Uint8Array([182, 111, 236, 54, 147, 210, 238, 80, 164, 230, 15, 207]);

export const mockEncryption = new Uint8Array([72, 226, 159, 56, 148, 237, 151, 96, 215, 121, 26, 34, 85, 0, 123, 114, 30, 95, 102, 227, 209, 156]);

// GLOBAL MOCKS -------------------------------------------

export const mockEncrypt = jest.fn(() => mockEncryption.buffer);

export const mockDecrypt = jest.fn(() => mockDataEncoded);

export const mockImportKey = jest.fn(() => 'imporKeyResult');

export const mockDigest = jest.fn(() => mockDataSha256Bytes.buffer);

export const mockSubtle = {
    encrypt: mockEncrypt,
    decrypt: mockDecrypt,
    importKey: mockImportKey,
    digest: mockDigest,
};

export const mockGetRandomValues = jest.fn(() => mockRandomValues);

export const mockCrypto = () => {
    global.crypto = {
        subtle: mockSubtle,
        getRandomValues: mockGetRandomValues,
    };
};

export const mockEncode = jest.fn(() => mockDataEncoded);

export const mockTextEncoder = (props) => {
    global.TextEncoder = class {
        constructor() {
            this.encode = mockEncode;

            Object.assign(this, { ...props });
        }
    };
};

// --------------------------------------------------------
