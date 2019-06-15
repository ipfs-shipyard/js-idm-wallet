import hexarray from 'hex-array';
import getRandomBytes from './random';
import { UnsupportedCypherAlgorithm } from '../errors/crypto';

export const ALGORITHM_NAME = 'AES-GCM';
export const KEY_LENGTH = 256 / 8;

const toHex = (encryptedData) => ({
    ...encryptedData,
    cypherText: hexarray.toString(encryptedData.cypherText, { uppercase: false }),
    iv: hexarray.toString(encryptedData.iv, { uppercase: false }),
});

const fromHex = (encryptedData) => ({
    ...encryptedData,
    cypherText: hexarray.fromString(encryptedData.cypherText),
    iv: hexarray.fromString(encryptedData.iv,),
});

export const generateCypherKey = () => getRandomBytes(KEY_LENGTH);

export const encrypt = async (data, key, hex = false) => {
    const algorithm = ALGORITHM_NAME;
    // As per the AES publication, IV should be 12 bytes for GCM
    // See https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-38d.pdf, page 15
    const iv = getRandomBytes(12);

    const cryptoKey = await crypto.subtle.importKey('raw', key, algorithm, false, ['encrypt']);
    const cypherText = await crypto.subtle.encrypt({ name: algorithm, iv }, cryptoKey, data);

    let encryptedData = {
        algorithm: ALGORITHM_NAME,
        cypherText: new Uint8Array(cypherText),
        iv,
    };

    if (hex) {
        encryptedData = toHex(encryptedData);
    }

    return encryptedData;
};

export const decrypt = async (encryptedData, key) => {
    if (typeof encryptedData.cypherText === 'string') {
        encryptedData = fromHex(encryptedData);
    }

    const { algorithm, cypherText, iv } = encryptedData;

    if (algorithm !== ALGORITHM_NAME) {
        throw new UnsupportedCypherAlgorithm(algorithm);
    }

    const cryptoKey = await crypto.subtle.importKey('raw', key, algorithm, false, ['decrypt']);
    const decryptedValue = await crypto.subtle.decrypt({ name: algorithm, iv }, cryptoKey, cypherText);

    return new Uint8Array(decryptedValue);
};

export const isEncrypted = (encryptedData) =>
    Boolean(encryptedData && encryptedData.algorithm && encryptedData.cypherText && encryptedData.iv);
