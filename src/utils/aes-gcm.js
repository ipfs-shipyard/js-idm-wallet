const name = 'AES-GCM';

export const encrypt = async (data, key) => {
    const algorithm = {
        name,
        // As per the AES publication, IV should be 12 bytes for GCM
        // See https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-38d.pdf, page 15
        iv: crypto.getRandomValues(new Uint8Array(12)),
    };

    const cryptoKey = await crypto.subtle.importKey('raw', key, algorithm.name, false, ['encrypt']);
    const cypherText = await crypto.subtle.encrypt(algorithm, cryptoKey, data);

    return {
        algorithm: name,
        iv: algorithm.iv,
        cypherText: new Uint8Array(cypherText),
    };
};

export const decrypt = async (cypherText, iv, key) => {
    const algorithm = { name, iv };

    const cryptoKey = await crypto.subtle.importKey('raw', key, algorithm.name, false, ['decrypt']);
    const decryptedValue = await crypto.subtle.decrypt(algorithm, cryptoKey, cypherText);

    return new Uint8Array(decryptedValue);
};
