const getRandomBytes = (size) => crypto.getRandomValues(new Uint8Array(size));

export default getRandomBytes;
