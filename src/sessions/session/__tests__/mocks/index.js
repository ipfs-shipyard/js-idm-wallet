export const mockDate = () => {
    class Date {
        static now() {
            return 1559147951115;
        }
    }

    Object.defineProperty(global, 'Date', { value: Date, writable: true });
};

export const mockIdentityId = '1a2b3c';

export const mockSessionId = '0d95f0ff8db38ed522374804da702dd8';

export const mockIdentity = {
    getId: jest.fn(() => mockIdentityId),
    apps: {
        add: jest.fn(() => Promise.resolve()),
        linkCurrentDevice: jest.fn(() => Promise.resolve()),
        unlinkCurrentDevice: jest.fn(() => Promise.resolve()),
    },
};

export const mockApp = {
    id: '4d5e6f',
    name: 'MyDapp',
    homepageUrl: 'http://mydapp.com',
    iconUrl: 'https://mydapp.com/icon',
};

export const mockSessionDescriptor = {
    id: mockSessionId,
    appId: '4d5e6f',
    identityId: '1a2b3c',
    createAt: 1559147951115,
    expiresAt: 1566923951115,
};

export const mockStorage = {
    get: jest.fn(() => Promise.resolve(mockSessionDescriptor)),
    set: jest.fn(() => Promise.resolve()),
    remove: jest.fn(() => Promise.resolve()),
    list: jest.fn(() => Promise.resolve([mockSessionDescriptor])),
};

export const mockIdentities = {
    has: jest.fn(() => true),
    get: jest.fn(() => mockIdentity),
};
