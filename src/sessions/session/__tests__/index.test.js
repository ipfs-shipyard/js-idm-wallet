import nanoidGenerate from 'nanoid/generate';
import { createSession, removeSession, loadSessions } from '../index';
import { mockDate, mockIdentity, mockApp, mockStorage, mockSessionDescriptor, mockSessionId, mockIdentities } from './mocks';

jest.mock('nanoid/generate', () => jest.fn(() => '0d95f0ff8db38ed522374804da702dd8'));

mockDate();

beforeEach(() => {
    jest.clearAllMocks();
});

describe('createSession', () => {
    it('should create session successfully', async () => {
        const session = await createSession({ app: mockApp }, mockIdentity, mockStorage);

        expect(session.getId()).toBe(mockSessionId);
        expect(session.getAppId()).toBe('4d5e6f');
        expect(session.getIdentityId()).toBe('1a2b3c');
        expect(session.getCreatedAt()).toBe(1559147951115);
        expect(session.isValid()).toBe(true);

        expect(nanoidGenerate).toHaveBeenCalledTimes(1);
        expect(nanoidGenerate).toHaveBeenCalledWith('1234567890abcdef', 32);

        expect(mockIdentity.apps.add).toHaveBeenCalledTimes(1);
        expect(mockIdentity.apps.add).toHaveBeenCalledWith(mockApp);
        expect(mockIdentity.apps.linkCurrentDevice).toHaveBeenCalledTimes(1);
        expect(mockIdentity.apps.linkCurrentDevice).toHaveBeenCalledWith(mockApp.id);

        expect(mockStorage.set).toHaveBeenCalledTimes(1);
        expect(mockStorage.set).toHaveBeenCalledWith('session!0d95f0ff8db38ed522374804da702dd8', mockSessionDescriptor);
    });

    it('should throw if options is not an object', async () => {
        expect(createSession({ app: mockApp, options: [] })).rejects.toThrow('Session options must be a plain object');
    });
});

describe('removeSession', () => {
    it('should remove session successfully', async () => {
        await removeSession(mockSessionId, mockIdentities, mockStorage);

        expect(mockStorage.get).toHaveBeenCalledTimes(1);
        expect(mockStorage.get).toHaveBeenCalledWith('session!0d95f0ff8db38ed522374804da702dd8');

        expect(mockStorage.remove).toHaveBeenCalledTimes(1);
        expect(mockStorage.remove).toHaveBeenCalledWith('session!0d95f0ff8db38ed522374804da702dd8');

        expect(mockIdentities.has).toHaveBeenCalledTimes(1);
        expect(mockIdentities.has).toHaveBeenCalledWith('1a2b3c');

        expect(mockIdentities.get).toHaveBeenCalledTimes(1);
        expect(mockIdentities.get).toHaveBeenCalledWith('1a2b3c');

        expect(mockIdentity.apps.unlinkCurrentDevice).toHaveBeenCalledTimes(1);
        expect(mockIdentity.apps.unlinkCurrentDevice).toHaveBeenCalledWith('4d5e6f');
    });

    it('should be successful if no session available', async () => {
        const storage = { ...mockStorage, get: jest.fn(() => Promise.resolve()) };

        await removeSession(mockSessionId, mockIdentities, storage);

        expect(storage.get).toHaveBeenCalledTimes(1);
        expect(storage.get).toHaveBeenCalledWith('session!0d95f0ff8db38ed522374804da702dd8');

        expect(mockStorage.remove).toHaveBeenCalledTimes(0);
        expect(mockIdentities.has).toHaveBeenCalledTimes(0);
        expect(mockIdentities.get).toHaveBeenCalledTimes(0);
        expect(mockIdentity.apps.unlinkCurrentDevice).toHaveBeenCalledTimes(0);
    });

    it('should not unlink current device if identity does not exist', async () => {
        const identities = { ...mockIdentities, has: jest.fn(() => false) };

        await removeSession(mockSessionId, identities, mockStorage);

        expect(mockStorage.get).toHaveBeenCalledTimes(1);
        expect(mockStorage.get).toHaveBeenCalledWith('session!0d95f0ff8db38ed522374804da702dd8');

        expect(mockStorage.remove).toHaveBeenCalledTimes(1);
        expect(mockStorage.remove).toHaveBeenCalledWith('session!0d95f0ff8db38ed522374804da702dd8');

        expect(identities.has).toHaveBeenCalledTimes(1);
        expect(identities.has).toHaveBeenCalledWith('1a2b3c');

        expect(identities.get).toHaveBeenCalledTimes(0);
        expect(mockIdentity.apps.unlinkCurrentDevice).toHaveBeenCalledTimes(0);
    });
});

describe('loadSessions', () => {
    it('should load sessions successfully', async () => {
        const sessions = await loadSessions(mockStorage);
        const sessionsArray = Object.values(sessions);

        expect(mockStorage.list).toHaveBeenCalledTimes(1);
        expect(mockStorage.list).toHaveBeenCalledWith({ gte: 'session!', lte: 'session!\xFF', keys: false });

        expect(sessionsArray).toHaveLength(1);

        sessionsArray.forEach((session) => expect(session.constructor.name).toBe('Session'));
    });
});
