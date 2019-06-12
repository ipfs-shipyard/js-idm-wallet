export const secret = new Uint8Array([105, 138, 245, 194, 117, 171, 128, 112, 211, 127, 197, 170, 239, 214, 246, 241, 138, 190, 172, 218, 89, 244, 179, 72, 136, 25, 163, 199, 205, 139, 231, 146]);

export const scrypt = {
    passphraseKey: new Uint8Array([193, 234, 133, 113, 35, 196, 183, 1, 141, 26, 145, 163, 132, 157, 67, 82, 244, 214, 37, 6, 145, 106, 130, 7, 175, 112, 56, 3, 137, 176, 62, 34]),
};

export const cryptoEncryptResultHex = 'd67b84c15970607335eba44474ac97f27a2366ab861e6550529333cfe5b788999dc26738c2c539e7093a7c4063b80703';

export const crypto = {
    getRandomValues: (value) => {
        const size = typeof value === 'number' ? value : value.length;
        const array = [247, 234, 145, 238, 132, 30, 170, 187, 93, 143, 190, 45, 188, 159, 233, 112].slice(0, size);

        return new Uint8Array(array);
    },
};

export const storedPassphrase = {
    keyDerivation: {
        algorithm: 'scrypt',
        params: {
            N: 32768,
            p: 1,
            r: 8,
        },
        salt: 'f7ea91ee841eaabb5d8fbe2dbc9fe970',
    },
    encryptedSecret: {
        algorithm: 'AES-GCM',
        cypherText: cryptoEncryptResultHex,
        iv: 'f7ea91ee841eaabb5d8fbe2d',
    },
};

export const TextEncoder = class {
    encode(text) {
        switch (text) {
        case 'walletPassphrase':
            return new Uint8Array([119, 97, 108, 108, 101, 116, 80, 97, 115, 115, 112, 104, 114, 97, 115, 101]);
        default:
            return new Uint8Array([]);
        }
    }
};

export const enableTest = {
    success: {
        crypto: {
            subtle: {
                importKey: {
                    params: ['raw', scrypt.passphraseKey, 'AES-GCM', false, ['encrypt']],
                    result: {
                        algorithm: { name: 'AES-GCM', length: 256 },
                        extractable: false,
                        type: 'secret',
                        usages: ['encrypt'],
                    },
                },
                encrypt: {
                    params: [
                        {
                            name: 'AES-GCM',
                            iv: crypto.getRandomValues(12),
                        },
                        {
                            algorithm: { name: 'AES-GCM', length: 256 },
                            extractable: false,
                            type: 'secret',
                            usages: ['encrypt'],
                        },
                        secret,
                    ],
                    result: [214, 123, 132, 193, 89, 112, 96, 115, 53, 235, 164, 68, 116, 172, 151, 242, 122, 35, 102, 171, 134, 30, 101, 80, 82, 147, 51, 207, 229, 183, 136, 153, 157, 194, 103, 56, 194, 197, 57, 231, 9, 58, 124, 64, 99, 184, 7, 3],
                },
            },
        },
    },
};

export const unlockTest = {
    success: {
        crypto: {
            subtle: {
                importKey: {
                    params: ['raw', scrypt.passphraseKey, 'AES-GCM', false, ['decrypt']],
                    result: {
                        algorithm: { name: 'AES-GCM', length: 256 },
                        extractable: false,
                        type: 'secret',
                        usages: ['decrypt'],
                    },
                },
                decrypt: {
                    params: [
                        {
                            name: 'AES-GCM',
                            iv: crypto.getRandomValues(12),
                        },
                        {
                            algorithm: { name: 'AES-GCM', length: 256 },
                            extractable: false,
                            type: 'secret',
                            usages: ['decrypt'],
                        },
                        new Uint8Array([214, 123, 132, 193, 89, 112, 96, 115, 53, 235, 164, 68, 116, 172, 151, 242, 122, 35, 102, 171, 134, 30, 101, 80, 82, 147, 51, 207, 229, 183, 136, 153, 157, 194, 103, 56, 194, 197, 57, 231, 9, 58, 124, 64, 99, 184, 7, 3]),
                    ],
                    result: secret,
                },
            },
        },
    },
};
