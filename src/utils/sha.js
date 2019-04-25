export const sha256 = async (text) => {
    // Encode as UTF-8
    const msgBuffer = new TextEncoder('utf-8').encode(text);

    // Hash the message
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);

    // Convert ArrayBuffer to Array
    const hashArray = Array.from(new Uint8Array(hashBuffer));

    // Convert bytes to hex string
    const hashHex = hashArray.map((b) => `00${b.toString(16)}`.slice(-2)).join('');

    return hashHex;
};
