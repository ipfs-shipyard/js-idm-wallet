export const DESCRIPTOR_KEY_PREFIX = 'session!';

export const getSessionKey = (sessionId) => `${DESCRIPTOR_KEY_PREFIX}${sessionId}`;
