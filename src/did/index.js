import createIpid from './methods/ipid';
import { UnsupportedDidMethodError, UnsupportedDidMethodPurposeError, InvalidDidError } from '../utils/errors';

class Did {
    #methods;

    constructor(methods) {
        this.#methods = methods;
    }

    async resolve(did) {
        const { method } = this.#parseDid(did);

        this.#assertSupport(method, 'resolve');

        return this.#methods[method].resolve(did);
    }

    async create(method, params, operations) {
        this.#assertSupport(method, 'create');

        return this.#methods[method].create(params, operations);
    }

    async update(did, params, operations) {
        const { method } = this.#parseDid(did);

        this.#assertSupport(method, 'update');

        return this.#methods[method].update(did, params, operations);
    }

    async isPublicKeyValid(did, publicKeyId, options) {
        const { method } = this.#parseDid(did);

        this.#assertSupport(method, 'isPublicKeyValid');

        return this.#methods[method].isPublicKeyValid(did, publicKeyId, options);
    }

    getMethods() {
        return Object.values(this.#methods).map((method) => method.constructor.info);
    }

    #assertSupport = (method, purpose) => {
        if (!this.#methods[method]) {
            throw new UnsupportedDidMethodError(method);
        }

        if (!this.#methods[method][purpose]) {
            throw new UnsupportedDidMethodPurposeError(method, purpose);
        }
    }

    #parseDid = (did) => {
        const match = did.match(/did:(\w+):(\w+).*/);

        if (!match) {
            throw new InvalidDidError(did);
        }

        return { method: match[1], identifier: match[2] };
    };
}

const createDid = (ipfs) => {
    const methods = {
        ipid: createIpid(ipfs),
    };

    return new Did(methods);
};

export default createDid;
