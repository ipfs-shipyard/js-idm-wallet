import createSessions from '../index';
import { createMockStorage, mockIdentityId, createMockIdentities, mockSessionId, mockSessionDescriptor, mockApp } from './mocks';

console.warn = jest.fn();

beforeEach(() => {
    jest.clearAllMocks();
});

it('should have all specification methods', async () => {
    const mockStorage = createMockStorage();
    const mockIdentities = createMockIdentities();

    const sessions = await createSessions(mockStorage, mockIdentities);

    expect(typeof sessions.getById).toBe('function');
    expect(typeof sessions.isValid).toBe('function');
    expect(typeof sessions.create).toBe('function');
    expect(typeof sessions.destroy).toBe('function');

    expect(mockIdentities.onLoad).toHaveBeenCalledTimes(1);
    expect(mockIdentities.onChange).toHaveBeenCalledTimes(1);
});

describe('getById', () => {
    it('should get session by id successfully', async () => {
        const mockStorage = createMockStorage();
        const mockIdentities = createMockIdentities();

        const sessions = await createSessions(mockStorage, mockIdentities);
        const session = sessions.getById(mockSessionId);

        expect(session.getId()).toBe(mockSessionId);
    });

    it('should throw if no session found', async () => {
        const mockStorage = createMockStorage();
        const mockIdentities = createMockIdentities();

        const sessions = await createSessions(mockStorage, mockIdentities);

        expect(() => sessions.getById('foo')).toThrow('Unknown session with: foo');
    });
});

describe('isValid', () => {
    it('should return true if valid', async () => {
        const mockStorage = createMockStorage();
        const mockIdentities = createMockIdentities();

        const sessions = await createSessions(mockStorage, mockIdentities);

        expect(sessions.isValid(mockSessionId)).toBe(true);
    });

    it('should return false if invalid session id', async () => {
        const mockStorage = createMockStorage();
        const mockIdentities = createMockIdentities();

        const sessions = await createSessions(mockStorage, mockIdentities);

        expect(sessions.isValid('foo')).toBe(false);
    });

    it('should return false if session is invalid', async () => {
        const mockStorage = createMockStorage({ [`session!${mockSessionId}`]: { ...mockSessionDescriptor, expiresAt: 1 } });
        const mockIdentities = createMockIdentities();

        const sessions = await createSessions(mockStorage, mockIdentities);

        expect(sessions.isValid(mockSessionId)).toBe(false);
    });
});

describe('create', () => {
    it('should create a new session successfully', async () => {
        const app = { ...mockApp, id: 'foo' };
        const mockStorage = createMockStorage({});
        const mockIdentities = createMockIdentities();
        const mockIdentity = mockIdentities.get(mockIdentityId);

        const sessions = await createSessions(mockStorage, mockIdentities);
        const session = await sessions.create(mockIdentityId, app);

        expect(session.getIdentityId()).toBe(mockIdentityId);
        expect(session.getAppId()).toBe('foo');

        expect(mockStorage.set).toHaveBeenCalledTimes(1);

        expect(sessions.getById(session.getId())).toBe(session);

        expect(mockIdentity.apps.onRevoke).toHaveBeenCalledTimes(1);
        expect(mockIdentity.apps.onLinkCurrentChange).toHaveBeenCalledTimes(1);
    });

    it('should return a valid session if available', async () => {
        const mockStorage = createMockStorage();
        const mockIdentities = createMockIdentities();

        const sessions = await createSessions(mockStorage, mockIdentities);
        const session = await sessions.create(mockIdentityId, mockApp);

        expect(session.getId()).toBe(mockSessionId);
        expect(session.getIdentityId()).toBe(mockIdentityId);
        expect(session.getAppId()).toBe(mockApp.id);

        expect(mockStorage.set).toHaveBeenCalledTimes(0);
    });

    it('should destroy a session if exists but identity does not', async () => {
        const mockStorage = createMockStorage();
        const mockIdentities = createMockIdentities({});

        const sessions = await createSessions(mockStorage, mockIdentities);

        await expect(sessions.create(mockIdentityId, mockApp)).rejects.toThrow('Unknown identity with: 1a2b3c');

        expect(mockStorage.remove).toHaveBeenCalledTimes(1);
        expect(mockStorage.remove).toHaveBeenCalledWith(`session!${mockSessionDescriptor.id}`);

        expect(mockStorage.set).toHaveBeenCalledTimes(0);
    });

    it('should destroy an invalid session and return a new one', async () => {
        const mockStorage = createMockStorage({ [`session!${mockSessionId}`]: { ...mockSessionDescriptor, expiresAt: 1 } });
        const mockIdentities = createMockIdentities();
        const mockIdentity = mockIdentities.get(mockIdentityId);

        const sessions = await createSessions(mockStorage, mockIdentities);
        const newSession = await sessions.create(mockIdentityId, mockApp);

        // Should delete current invalid session first
        expect(mockStorage.remove).toHaveBeenCalledTimes(1);
        expect(mockStorage.remove).toHaveBeenCalledWith(`session!${mockSessionDescriptor.id}`);
        expect(mockIdentity.apps.unlinkCurrentDevice).toHaveBeenCalledTimes(1);
        expect(mockIdentity.apps.unlinkCurrentDevice).toHaveBeenCalledWith(mockApp.id);

        // Should create a new session after the previous session was removed
        expect(mockStorage.set).toHaveBeenCalledTimes(1);
        expect(mockIdentity.apps.onRevoke).toHaveBeenCalledTimes(1);
        expect(mockIdentity.apps.onLinkCurrentChange).toHaveBeenCalledTimes(1);

        expect(sessions.getById(newSession.getId())).toBe(newSession);
    });
});

describe('destroy', () => {
    it('should be destroy session successfully', async () => {
        const mockStorage = createMockStorage();
        const mockIdentities = createMockIdentities();
        const mockIdentity = mockIdentities.get(mockIdentityId);

        const sessions = await createSessions(mockStorage, mockIdentities);

        await sessions.destroy(mockSessionId);

        expect(mockStorage.remove).toHaveBeenCalledTimes(1);
        expect(mockStorage.remove).toHaveBeenCalledWith(`session!${mockSessionDescriptor.id}`);

        expect(mockIdentity.apps.unlinkCurrentDevice).toHaveBeenCalledTimes(1);
        expect(mockIdentity.apps.unlinkCurrentDevice).toHaveBeenCalledWith(mockApp.id);

        expect(() => sessions.getById(mockSessionId)).toThrow('Unknown session with: 0d95f0ff8db38ed522374804da702dd8');
    });

    it('should be successful if session does not exist', async () => {
        const mockStorage = createMockStorage();
        const mockIdentities = createMockIdentities();

        const sessions = await createSessions(mockStorage, mockIdentities);

        await sessions.destroy('foo');

        expect(mockStorage.remove).toHaveBeenCalledTimes(0);
    });

    it('should re-add session and listeners if something goes wrong', async () => {
        const mockStorage = createMockStorage({}, {
            remove: jest.fn(() => Promise.reject(new Error('foo'))),
        });
        const mockIdentities = createMockIdentities();
        const mockIdentity = mockIdentities.get(mockIdentityId);

        const sessions = await createSessions(mockStorage, mockIdentities);
        const session = await sessions.create(mockIdentityId, mockApp);

        expect(sessions.getById(session.getId())).toBe(session);
        expect(mockStorage.set).toHaveBeenCalledTimes(1);
        expect(mockIdentity.apps.onRevoke).toHaveBeenCalledTimes(1);
        expect(mockIdentity.apps.onLinkCurrentChange).toHaveBeenCalledTimes(1);

        await expect(sessions.destroy(session.getId())).rejects.toThrow('foo');

        expect(sessions.getById(session.getId())).toBe(session);
        expect(mockIdentity.apps.onRevoke).toHaveBeenCalledTimes(2);
        expect(mockIdentity.apps.onLinkCurrentChange).toHaveBeenCalledTimes(2);
    });
});

describe('handleIdentitesLoad', () => {
    it('should handle identities load successfully', async (done) => {
        const mockStorage = createMockStorage({
            'session!1234': { ...mockApp, id: '1234', identityId: mockIdentityId },
            'session!5678': { ...mockApp, id: '5678', identityId: 'foo' },
        });
        const mockIdentities = createMockIdentities();

        const sessions = await createSessions(mockStorage, mockIdentities);

        mockIdentities.simulateLoad();

        setImmediate(() => {
            expect(() => sessions.getById('1234')).not.toThrow();
            expect(() => sessions.getById('5678')).toThrow('Unknown session with: 5678');

            expect(mockStorage.remove).toHaveBeenCalledTimes(1);
            expect(mockStorage.remove).toHaveBeenCalledWith('session!5678');

            done();
        });
    });

    it('should warn if something went wrong destroying session for unknown identity', async (done) => {
        const mockStorage = createMockStorage({
            'session!1234': { ...mockApp, id: '1234', identityId: mockIdentityId },
            'session!5678': { ...mockApp, id: '5678', identityId: 'foo' },
        });
        const mockIdentities = createMockIdentities();

        const sessions = await createSessions(mockStorage, mockIdentities);

        sessions.destroy = jest.fn(() => Promise.reject(new Error('test')));

        mockIdentities.simulateLoad();

        setImmediate(() => {
            expect(() => sessions.getById('1234')).not.toThrow();
            expect(() => sessions.getById('5678')).toThrow('Unknown session with: 5678');

            expect(mockStorage.remove).toHaveBeenCalledTimes(0);
            expect(console.warn).toHaveBeenCalledTimes(1);
            expect(console.warn).toHaveBeenCalledWith('Something went wrong destroying session "5678" for unknown identity "foo". Will retry on reload.');

            done();
        });
    });
});

describe('handleIdentitiesChange', () => {
    it('should handle identities change successfully', async (done) => {
        const mockStorage = createMockStorage({});
        const mockIdentities = createMockIdentities();

        const sessions = await createSessions(mockStorage, mockIdentities);
        const session = await sessions.create(mockIdentityId, mockApp);

        mockIdentities.simulateChange({ type: 'remove', id: mockIdentityId });

        setImmediate(() => {
            expect(() => sessions.getById(session.getId())).toThrow(`Unknown session with: ${session.getId()}`);

            expect(mockStorage.remove).toHaveBeenCalledTimes(1);
            expect(mockStorage.remove).toHaveBeenCalledWith(`session!${session.getId()}`);

            done();
        });
    });

    it('should not do anything if the change was not a remove operation', async (done) => {
        const mockStorage = createMockStorage({});
        const mockIdentities = createMockIdentities();

        const sessions = await createSessions(mockStorage, mockIdentities);
        const session = await sessions.create(mockIdentityId, mockApp);

        mockIdentities.simulateChange({ type: 'foo', id: mockIdentityId });

        setImmediate(() => {
            expect(sessions.getById(session.getId())).toBe(session);

            expect(mockStorage.remove).toHaveBeenCalledTimes(0);

            done();
        });
    });
});

describe('handleAppRevoke', () => {
    it('should handle identity app revoke successfully', async (done) => {
        const mockStorage = createMockStorage({});
        const mockIdentities = createMockIdentities();
        const mockIdentity = mockIdentities.get(mockIdentityId);

        const sessions = await createSessions(mockStorage, mockIdentities);
        const session = await sessions.create(mockIdentityId, mockApp);

        await mockIdentity.apps.revoke(mockApp.id);

        setImmediate(() => {
            expect(() => sessions.getById(session.getId())).toThrow(`Unknown session with: ${session.getId()}`);

            expect(mockStorage.remove).toHaveBeenCalledTimes(1);
            expect(mockStorage.remove).toHaveBeenCalledWith(`session!${session.getId()}`);

            done();
        });
    });

    it('should warn if something went wrong destroying session for identity app revocation', async (done) => {
        const mockStorage = createMockStorage({});
        const mockIdentities = createMockIdentities();
        const mockIdentity = mockIdentities.get(mockIdentityId);

        const sessions = await createSessions(mockStorage, mockIdentities);
        const session = await sessions.create(mockIdentityId, mockApp);

        sessions.destroy = jest.fn(() => Promise.reject(new Error('test')));

        await mockIdentity.apps.revoke(mockApp.id);

        setImmediate(() => {
            expect(sessions.getById(session.getId())).toBe(session);
            expect(mockStorage.remove).toHaveBeenCalledTimes(0);

            expect(console.warn).toHaveBeenCalledTimes(1);
            expect(console.warn).toHaveBeenCalledWith('Something went wrong destroying session after app "4d5e6f" revocation for identity "1a2b3c"');

            done();
        });
    });

    it('should not call destroy if session for identity app does not exist', async (done) => {
        const mockStorage = createMockStorage({});
        const mockIdentities = createMockIdentities();
        const mockIdentity = mockIdentities.get(mockIdentityId);

        const sessions = await createSessions(mockStorage, mockIdentities);
        const session = await sessions.create(mockIdentityId, mockApp);

        sessions.destroy = jest.fn();

        await mockIdentity.apps.revoke('foo');

        setImmediate(() => {
            expect(sessions.getById(session.getId())).toBe(session);
            expect(mockStorage.remove).toHaveBeenCalledTimes(0);
            expect(sessions.destroy).toHaveBeenCalledTimes(0);

            done();
        });
    });
});

describe('handleLinkCurrentChange', () => {
    it('should handle identity app current device unlink successfully', async (done) => {
        const mockStorage = createMockStorage({});
        const mockIdentities = createMockIdentities();
        const mockIdentity = mockIdentities.get(mockIdentityId);

        const sessions = await createSessions(mockStorage, mockIdentities);
        const session = await sessions.create(mockIdentityId, mockApp);

        await mockIdentity.apps.unlinkCurrentDevice(mockApp.id);

        setImmediate(() => {
            expect(() => sessions.getById(session.getId())).toThrow(`Unknown session with: ${session.getId()}`);

            expect(mockStorage.remove).toHaveBeenCalledTimes(1);
            expect(mockStorage.remove).toHaveBeenCalledWith(`session!${session.getId()}`);

            done();
        });
    });

    it('should not do anything if it is a link', async (done) => {
        const mockStorage = createMockStorage({});
        const mockIdentities = createMockIdentities();
        const mockIdentity = mockIdentities.get(mockIdentityId);

        const sessions = await createSessions(mockStorage, mockIdentities);
        const session = await sessions.create(mockIdentityId, mockApp);

        await mockIdentity.apps.linkCurrentDevice(mockApp.id);

        setImmediate(() => {
            expect(() => sessions.getById(session.getId())).not.toThrow();
            expect(mockStorage.remove).toHaveBeenCalledTimes(0);

            done();
        });
    });

    it('should warn if something went wrong destroying session', async (done) => {
        const mockStorage = createMockStorage({});
        const mockIdentities = createMockIdentities();
        const mockIdentity = mockIdentities.get(mockIdentityId);

        const sessions = await createSessions(mockStorage, mockIdentities);
        const session = await sessions.create(mockIdentityId, mockApp);

        sessions.destroy = jest.fn(() => Promise.reject(new Error('test')));

        await mockIdentity.apps.unlinkCurrentDevice(mockApp.id);

        setImmediate(() => {
            expect(sessions.getById(session.getId())).toBe(session);
            expect(mockStorage.remove).toHaveBeenCalledTimes(0);

            expect(console.warn).toHaveBeenCalledTimes(1);
            expect(console.warn).toHaveBeenCalledWith('Something went wrong destroying session after app "4d5e6f" revocation for identity "1a2b3c" in current device');

            done();
        });
    });
});
