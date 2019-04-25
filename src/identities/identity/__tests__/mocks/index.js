export const mockIdentityKey = 'identity!hex123';

export const mockBackupData = { mnemonic: 'a1 b2 c3 d4 e5 f6 g7 h8 i9 j10 k11 l12' };

export const mockDevice = {
    id: 'idm-device-123',
    type: 'phone',
    name: 'Mock Device',
    publicKey: 'a1b2c3',
};

export const mockDeviceWithPrivateKey = { ...mockDevice, privateKey: 'd4e5f6' };

export const mockIdentity = {
    did: 'did:ipid:a1b2c3d4',
    type: 'person',
    device: mockDeviceWithPrivateKey,
};

export const mockStorage = {
    set: jest.fn(),
    get: jest.fn(),
    remove: jest.fn(),
};
