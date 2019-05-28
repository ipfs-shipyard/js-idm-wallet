import signal from 'pico-signals';
import { UnknownIdentityError } from '../../../utils/errors';

export const mockApp = {
    id: '4d5e6f',
    name: 'MyDapp',
    homepageUrl: 'http://mydapp.com',
    iconUrl: 'https://mydapp.com/icon',
};

export const mockSessionId = '0d95f0ff8db38ed522374804da702dd8';

export const mockSessionDescriptor = {
    id: mockSessionId,
    appId: '4d5e6f',
    identityId: '1a2b3c',
    createAt: 1559147951115,
    expiresAt: 1566923951115,
};

// MOCK IDENTITIES
export const mockIdentityId = '1a2b3c';

export const createMockIdentity = (id = mockIdentityId) => {
    const apps = {};

    const onRevoke = signal();
    const onLinkCurrentChange = signal();

    return {
        getId: jest.fn(() => id),
        apps: {
            add: jest.fn((app) => {
                apps[app.id] = app;

                return Promise.resolve(app);
            }),
            revoke: jest.fn((appId) => {
                onRevoke.dispatch(appId);

                Promise.resolve();
            }),
            linkCurrentDevice: jest.fn((appId) => {
                onLinkCurrentChange.dispatch({ appId, isLinked: true });

                Promise.resolve();
            }),
            unlinkCurrentDevice: jest.fn((appId) => {
                onLinkCurrentChange.dispatch({ appId, isLinked: false });

                Promise.resolve();
            }),
            onRevoke: jest.fn((fn) => onRevoke.add(fn)),
            onLinkCurrentChange: jest.fn((fn) => onLinkCurrentChange.add(fn)),
        },
    };
};

export const createMockIdentities = (inititalIdentities, methods) => {
    let identities;

    if (inititalIdentities) {
        identities = { ...inititalIdentities };
    } else {
        identities = { [mockIdentityId]: createMockIdentity(mockIdentityId) };
    }

    const onLoad = signal();
    const onChange = signal();

    return {
        has: jest.fn((key) => Boolean(identities[key])),
        get: jest.fn((key) => {
            if (!identities[key]) {
                throw new UnknownIdentityError(key);
            }

            return identities[key];
        }),
        onLoad: jest.fn((fn) => onLoad.add(fn)),
        onChange: jest.fn((fn) => onChange.add(fn)),
        simulateLoad: () => onLoad.dispatch(Object.values(identities)),
        simulateChange: (operation) => onChange.dispatch(Object.values(identities), operation),
        ...methods,
    };
};

// MOCK STORAGE:

export const mockInitialStorage = {
    [`session!${mockSessionId}`]: mockSessionDescriptor,
};

export const createMockStorage = (initialStorage = mockInitialStorage, methods) => {
    const storage = { ...initialStorage };

    return {
        list: jest.fn(() => Promise.resolve(Object.values(storage))),
        get: jest.fn((key) => storage[key] ? Promise.resolve(storage[key]) : Promise.reject(new Error(`No storage for key: ${key}`))),
        set: jest.fn((key, value) => {
            storage[key] = value;

            return Promise.resolve();
        }),
        remove: jest.fn((key) => {
            delete storage[key];

            return Promise.resolve();
        }),
        ...methods,
    };
};
