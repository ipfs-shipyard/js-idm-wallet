import { Buffer } from 'buffer';
import secp256k1 from 'secp256k1';
import HDKey from 'hdkey';
import { random } from 'lodash';
import { composePrivateKey, composePublicKey } from 'crypto-key-composer';
import getRandomBytes from './random';

const SEED_LENGTH_BYTES = 512 / 8;
const SECP256K1_FIELD_SIZE = 256 / 8;

const bufferToUint8Array = (buffer) =>
    new Uint8Array(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));

const decodeEcPoint = (publicKey) => {
    if (publicKey[0] !== 4) {
        throw new Error('Only uncompressed EC points are supported');
    }
    if (publicKey.length !== (SECP256K1_FIELD_SIZE * 2) + 1) {
        throw new Error(`Expecting EC public key to have length ${(SECP256K1_FIELD_SIZE * 2) - 1}`);
    }

    return {
        x: publicKey.slice(1, SECP256K1_FIELD_SIZE + 1),
        y: publicKey.slice(SECP256K1_FIELD_SIZE + 1),
    };
};

const hdPrivateKeytoPem = (hdkey) => {
    const { privateKey, publicKey } = hdkey;
    const uncompressedPublicKey = secp256k1.publicKeyConvert(publicKey, false);

    const d = bufferToUint8Array(privateKey);
    const { x, y } = decodeEcPoint(bufferToUint8Array(uncompressedPublicKey));

    return composePrivateKey({
        format: 'raw-pem',
        keyAlgorithm: {
            id: 'ec-public-key',
            namedCurve: 'secp256k1',
        },
        keyData: {
            d,
            x,
            y,
        },
    });
};

const hdPublicKeytoPem = (hdkey) => {
    const { publicKey } = hdkey;
    const uncompressedPublicKey = secp256k1.publicKeyConvert(publicKey, false);

    const { x, y } = decodeEcPoint(bufferToUint8Array(uncompressedPublicKey));

    return composePublicKey({
        format: 'spki-pem',
        keyAlgorithm: {
            id: 'ec-public-key',
            namedCurve: 'secp256k1',
        },
        keyData: {
            x,
            y,
        },
    });
};

export const generateDeviceKeyMaterial = () => {
    // Generate a hdkey instance from a new seed
    const seed = getRandomBytes(SEED_LENGTH_BYTES);
    const hdkey = HDKey.fromMasterSeed(Buffer.from(seed));

    // Convert the key pair to pem
    const privateKeyPem = hdPrivateKeytoPem(hdkey);
    const publicKeyPem = hdPublicKeytoPem(hdkey);

    return {
        privateKeyPem,
        publicKeyPem,
        privateExtendedKeyBase58: hdkey.privateExtendedKey,
        publicExtendedKeyBase58: hdkey.publicExtendedKey,
    };
};

export const generateDeviceChildKeyMaterial = (devicePrivateExtendedKey) => {
    // Generate a hdkey instance from the private extended key
    const hdkey = HDKey.fromExtendedKey(devicePrivateExtendedKey);

    // Derivate the child key
    const childKeyIndex = random(0, (2 ** 31) - 1);
    const childKeyPath = `m/${childKeyIndex}`;
    const childHdkey = hdkey.derive(childKeyPath);

    const privateKeyPem = hdPrivateKeytoPem(childHdkey);
    const publicKeyPem = hdPublicKeytoPem(childHdkey);

    return {
        privateKeyPem,
        publicKeyPem,
        keyPath: childKeyPath,
    };
};
