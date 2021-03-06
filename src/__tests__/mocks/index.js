export class mockIpfs {
    constructor(options) {
        const { pass } = { ...options };

        this.pass = pass;
    }

    on(state, callback) {
        if (state === 'ready') {
            callback();
        }
    }
}

export const mockStorage = {
    list: jest.fn(() => []),
};
