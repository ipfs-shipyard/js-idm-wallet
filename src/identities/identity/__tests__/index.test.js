import { createIdentity, assertIdentity } from '../index';
import * as mocks from './mocks';

jest.mock('../../../utils/sha', () => ({
    sha256: jest.fn((text) => `sha256(${text})`),
}));

beforeEach(() => {
    jest.clearAllMocks();
});

describe('assertIdentity', () => {
    it('should assert successfully', () => {
        expect(() => assertIdentity(mocks.mockIdentity.did)).not.toThrow();
    });

    it('should throw with invalid did', () => {
        expect(() => assertIdentity(undefined)).toThrow('Invalid identity did: undefined');
        expect(() => assertIdentity('foobar')).toThrow('Invalid identity did: foobar');
    });
});

describe('createIdentity', () => {
    it('should create identity successfully', async () => {
        const identity = await createIdentity({
            did: mocks.mockIdentity.did,
            currentDevice: mocks.mockDeviceWithPrivateKey,
        });

        expect(typeof identity.getInfo).toBe('function');
        expect(typeof identity.serialize).toBe('function');
    });
});

describe('getInfo', () => {
    it('should return identity info successfully', async () => {
        const identity = await createIdentity({ ...mocks.mockIdentity, details: { name: 'John Doe' } });

        expect(identity.getInfo()).toEqual({
            did: 'did:ipid:a1b2c3d4',
            type: 'person',
            details: { name: 'John Doe' },
        });
    });
});

describe('serialize', () => {
    it('should return identity info successfully', async () => {
        const mockDetails = { name: 'John Doe' };
        const identity = await createIdentity({ ...mocks.mockIdentity, backup: mocks.mockBackupData, details: mockDetails });

        expect(identity.serialize()).toEqual({
            id: 'sha256(did:ipid:a1b2c3d4)',
            key: 'identity-sha256(did:ipid:a1b2c3d4)',
            did: 'did:ipid:a1b2c3d4',
            type: 'person',
            details: mockDetails,
            device: mocks.mockDeviceWithPrivateKey,
            backup: mocks.mockBackupData,
        });
    });
});
