export const mockDocument = {
    '@context': 'https://w3id.org/did/v1',
    id: 'did:ipid:QmUTE4cxTxihntPEFqTprgbqyyS9YRaRcC8FXp6PACEjFG',
    created: '2019-03-19T16:52:44.948Z',
    updated: '2019-03-19T16:53:56.463Z',
};

export const mockIpid = {
    constructor: {
        info: {
            method: 'ipid',
            description: 'The Interplanetary Identifiers DID method',
        },
    },
    resolve: jest.fn(() => mockDocument),
    create: jest.fn(() => mockDocument),
    update: jest.fn(() => mockDocument),
    isPublicKeyValid: jest.fn(() => true),
};
