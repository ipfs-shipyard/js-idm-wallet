export const mockSecretValue = new Uint8Array([167, 112, 73, 173, 25, 22, 164, 101, 52, 73, 60, 122, 49, 243, 101, 83, 68, 175, 86, 11, 77, 209, 70, 21, 102, 62, 205, 172, 76, 3, 207, 42]);

export const mockSecret = {
    get: jest.fn(() => mockSecretValue),
    getAsync: jest.fn(async () => mockSecretValue),
};

export const mockEncryptCypherTextHex = '0129888b73d6c82f23ec79612c4d97a2a591bc9094df83319c212cf324';

export const mockEncryptCypherIvHex = '0e2ab41e97025002314d5814';

export const mockEncryptedDataBytes = new Uint8Array([123, 34, 102, 111, 111, 34, 58, 34, 98, 97, 114, 34, 125]);

export const mockEncryptedDataStringified = `{"algorithm":"AES-GCM","iv":"${mockEncryptCypherIvHex}","cypherText":"${mockEncryptCypherTextHex}"}`;

export const mockEncryptedData = { algorithm: 'AES-GCM', iv: mockEncryptCypherIvHex, cypherText: mockEncryptCypherTextHex };

export const mockData = '{"foo":"bar"}';

// LEVEL DB MOCKS -----------------------------------------

export class MockReadStream {
    constructor(data, options) {
        this.data = data;
        this.options = { ...options };
    }

    events = {};

    on = (event, callback) => {
        this.events[event] = callback;

        if (event === 'data') {
            setImmediate(() => {
                try {
                    const { keys, values } = this.options;

                    if (values && !keys) {
                        this.data.forEach(({ value }) => callback(value));
                    } else if (!values && keys) {
                        this.data.forEach(({ key }) => callback(key));
                    } else {
                        this.data.forEach(callback);
                    }

                    this.events.end && this.events.end();
                } catch (err) {
                    this.events.error && this.events.error(err);
                }
            });
        }

        return this;
    };
}

export const mockGet = jest.fn(async (key) => JSON.stringify(`${key}-value`));

export const mockPut = jest.fn(async () => {});

export const mockDel = jest.fn(async () => {});

export const mockBatch = jest.fn(async () => {});

export const mockCreateReadStream = jest.fn((options) => new MockReadStream([
    { key: 1, value: JSON.stringify(123) },
    { key: 2, value: JSON.stringify({ a: 1 }) },
], options));

export const mockLevelApi = {
    get: mockGet,
    put: mockPut,
    del: mockDel,
    batch: mockBatch,
    createReadStream: mockCreateReadStream,
};

export const mockCreateLevel = (api) => jest.fn((location, options, callback) => callback(undefined, { ...mockLevelApi, ...api }));

// --------------------------------------------------------

// AES-GCM Mocks ------------------------------------------

export const mockEncrypt = jest.fn(async () => mockEncryptedData);

export const mockDecrypt = jest.fn(async () => mockEncryptedDataBytes);

export const mockCrypto = (api) => ({
    encrypt: mockEncrypt,
    decrypt: mockDecrypt,
    isEncrypted: (data) => Boolean(data.algorithm),
    ...api,
});

// --------------------------------------------------------

// GLOBAL MOCKS -------------------------------------------

export const mockDecode = jest.fn(() => mockData);

export const mockEncode = jest.fn(() => mockEncryptedDataBytes);

export const mockTextDecoder = (props) => {
    global.TextDecoder = class {
        constructor() {
            this.decode = mockDecode;

            Object.assign(this, { ...props });
        }
    };
};

export const mockTextEncoder = (props) => {
    global.TextEncoder = class {
        constructor() {
            this.encode = mockEncode;

            Object.assign(this, { ...props });
        }
    };
};

// --------------------------------------------------------
