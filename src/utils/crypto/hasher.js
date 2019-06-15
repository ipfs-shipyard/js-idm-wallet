import hexarray from 'hex-array';

export const hash = async (input, algorithm, hex = false) => {
    // Encode as UTF-8 to obtain an ArrayBuffer if input is a string
    if (typeof input === 'string') {
        input = new TextEncoder('utf-8').encode(input);
    }

    const result = await crypto.subtle.digest('SHA-256', input);

    let hash = new Uint8Array(result);

    if (hex) {
        hash = hexarray.toString(hash, { uppercase: false });
    }

    return hash;
};

export const hashSha1 = (input, hex) => hash(input, 'SHA-1', hex);

export const hashSha256 = (input, hex) => hash(input, 'SHA-256', hex);

export const hashSha384 = (input, hex) => hash(input, 'SHA-384', hex);

export const hashSha512 = (input, hex) => hash(input, 'SHA-512', hex);
