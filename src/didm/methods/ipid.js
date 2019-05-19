import createDidIpid, { getDid } from 'did-ipid';
import { getKeyPairFromMnemonic, getKeyPairFromSeed } from 'human-crypto-keys';

class Ipid {
    static info = {
        method: 'ipid',
        description: 'The Interplanetary Identifiers DID method (IPID) supports DIDs on the public and private Interplanetary File System (IPFS) networks.',
        homepageUrl: 'https://did-ipid.github.io/ipid-did-method/',
        icons: [],
    };

    #didIpid;
    #ipfs;

    constructor(ipfs) {
        this.#ipfs = ipfs;
    }

    async getDid(params) {
        const masterPrivateKey = await this.#getMasterPrivateKey(params);

        return getDid(masterPrivateKey);
    }

    async resolve(did) {
        const didIpid = await this.#getDidIpid();

        return didIpid.resolve(did);
    }

    async create(params, operations) {
        const masterPrivateKey = await this.#getMasterPrivateKey(params);
        const didIpid = await this.#getDidIpid();

        return didIpid.create(masterPrivateKey, operations);
    }

    async update(did, params, operations) {
        const masterPrivateKey = await this.#getMasterPrivateKey(params);
        const didIpid = await this.#getDidIpid();

        return didIpid.update(masterPrivateKey, operations);
    }

    async isPublicKeyValid(did, publicKeyId) {
        const { publicKey = [] } = await this.resolve(did);

        return publicKey.some((key) => key.id === publicKeyId);
    }

    #getDidIpid = async () => {
        if (this.#didIpid) {
            return this.#didIpid;
        }

        this.#didIpid = await createDidIpid(this.#ipfs);

        return this.#didIpid;
    };

    #getMasterPrivateKey = async (params) => {
        const { privateKey, mnemonic, seed } = params;

        if (privateKey) {
            return privateKey;
        }

        if (seed) {
            const { privateKey } = await getKeyPairFromSeed(seed, 'rsa');

            return privateKey;
        }

        if (mnemonic) {
            const { privateKey } = await getKeyPairFromMnemonic(mnemonic, 'rsa');

            return privateKey;
        }
    }
}

const createIpid = (ipfs) => new Ipid(ipfs);

export default createIpid;
