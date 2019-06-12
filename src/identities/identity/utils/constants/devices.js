// Orbit DB
export const ORBITDB_STORE_NAME = 'devices';

export const ORBITDB_STORE_TYPE = 'keyvalue';

// DID Document Key
export const DID_PUBLIC_KEY_PREFIX = 'idm-device-';

// Device Properties
export const DEVICE_TYPES = ['phone', 'tablet', 'laptop', 'desktop'];

// Keys in the descriptor that are consired sensitive and must not be replicated
export const DESCRIPTOR_SENSITIVE_KEYS = [
    'keyMaterial.privateKeyPem',
    'keyMaterial.privateKeyBase58',
    'keyMaterial.privateExtendedKeyBase58',
];
