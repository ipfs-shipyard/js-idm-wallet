const KEY_PREFIX = 'identity!';

export const DESCRIPTOR_KEY_PREFIX = `${KEY_PREFIX}descriptor!`;

export const getDescriptorKey = (identityId) => DESCRIPTOR_KEY_PREFIX + identityId;

export const getBackupKey = (identityId) => `${KEY_PREFIX}backup!${identityId}`;

export const getCurrentDeviceKey = (identityId) => `${KEY_PREFIX}currentDevice!${identityId}`;
