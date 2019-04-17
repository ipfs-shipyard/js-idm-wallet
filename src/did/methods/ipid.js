import createDidIpid from 'did-ipid';

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

    async resolve(did) {
        const didIpid = await this.#getDidIpid();

        return didIpid.resolve(did);
    }

    async create(params, operations) {
        const { privateKey } = { ...params };
        const didIpid = await this.#getDidIpid();

        return didIpid.create(privateKey, operations);
    }

    async update(did, params, operations) {
        const { privateKey } = { ...params };
        const didIpid = await this.#getDidIpid();

        return didIpid.update(privateKey, operations);
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
}

const createIpid = (ipfs) => new Ipid(ipfs);

export default createIpid;
