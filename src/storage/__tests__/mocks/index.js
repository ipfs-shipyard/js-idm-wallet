export const mockSecretValue = new Uint8Array([167, 112, 73, 173, 25, 22, 164, 101, 52, 73, 60, 122, 49, 243, 101, 83, 68, 175, 86, 11, 77, 209, 70, 21, 102, 62, 205, 172, 76, 3, 207, 42]);

export const mockSecret = {
    get: jest.fn(() => mockSecretValue),
};

export const mockEncryptCypherTextHex = '0129888B73D6C82F23EC79612C4D97A2A591BC9094DF83319C212CF324';

export const mockEncryptCypherTextBytes = new Uint8Array([1, 41, 136, 139, 115, 214, 200, 47, 35, 236, 121, 97, 44, 77, 151, 162, 165, 145, 188, 144, 148, 223, 131, 49, 156, 33, 44, 243, 36]);

export const mockEncryptCypherIvHex = '0E2AB41E97025002314D5814';

export const mockEncryptCypherIvBytes = new Uint8Array([14, 42, 180, 30, 151, 2, 80, 2, 49, 77, 88, 20]);

export const mockEncryptedDataBytes = new Uint8Array([123, 34, 102, 111, 111, 34, 58, 34, 98, 97, 114, 34, 125]);

export const mockEncryptedDataStringified = `{"algorithm":"AES-GCM","iv":"${mockEncryptCypherIvHex}","cypherText":"${mockEncryptCypherTextHex}"}`;

export const mockEncryptedData = { algorithm: 'AES-GCM', iv: mockEncryptCypherIvBytes, cypherText: mockEncryptCypherTextBytes };

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

export const mockGet = jest.fn((key) => Promise.resolve(`"${key}-value"`));

export const mockPut = jest.fn(() => Promise.resolve());

export const mockDel = jest.fn(() => Promise.resolve());

export const mockBatch = jest.fn(() => Promise.resolve());

export const mockCreateReadStream = jest.fn((options) => new MockReadStream([
    { key: 1, value: '123' },
    { key: 2, value: '{"a":1}' },
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

export const mockEncrypt = jest.fn(() => Promise.resolve(mockEncryptedData));

export const mockDecrypt = jest.fn(() => Promise.resolve(mockEncryptedDataBytes));

export const mockCreateAesGcm = (api) => ({
    encrypt: mockEncrypt,
    decrypt: mockDecrypt,
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
