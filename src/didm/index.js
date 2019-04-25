import createIpid from './methods/ipid';
import { parseDid } from '../utils';
import { UnsupportedDidMethodError, UnsupportedDidMethodPurposeError } from '../utils/errors';

class Didm {
    #methods;

    constructor(methods) {
        this.#methods = methods;
    }

    async getDid(method, params) {
        this.#assertSupport(method, 'getDid');

        return this.#methods[method].getDid(params);
    }

    async resolve(did) {
        const { method } = parseDid(did);

        this.#assertSupport(method, 'resolve');

        return this.#methods[method].resolve(did);
    }

    async create(method, params, operations) {
        this.#assertSupport(method, 'create');

        return this.#methods[method].create(params, operations);
    }

    async update(did, params, operations) {
        const { method } = parseDid(did);

        this.#assertSupport(method, 'update');

        return this.#methods[method].update(did, params, operations);
    }

    async isPublicKeyValid(did, publicKeyId, options) {
        const { method } = parseDid(did);

        this.#assertSupport(method, 'isPublicKeyValid');

        return this.#methods[method].isPublicKeyValid(did, publicKeyId, options);
    }

    getMethods() {
        return Object.values(this.#methods).map((method) => method.constructor.info);
    }

    isSupported(method, purpose) {
        try {
            this.#assertSupport(method, purpose);

            return true;
        } catch (err) {
            return false;
        }
    }

    #assertSupport = (method, purpose) => {
        if (!this.#methods[method]) {
            throw new UnsupportedDidMethodError(method);
        }

        if (!this.#methods[method][purpose]) {
            throw new UnsupportedDidMethodPurposeError(method, purpose);
        }
    }
}

const createDidm = (ipfs) => {
    const methods = {
        ipid: createIpid(ipfs),
    };

    return new Didm(methods);
};

export default createDidm;
