import EthrDID from 'ethr-did';
import resolve from 'did-resolver';
import registerEthrDidToResolver from 'ethr-did-resolver';
import { ETHR_REGISTRY_ADDRESS } from '../../utils/constants';

import util from 'ethereumjs-util';
import bip39 from 'bip39';
import hdkey from 'ethereumjs-wallet/hdkey';

import { MissingDidParameters, DidResolveError } from '../../utils/errors';

// Note
class Ethr {
    static info = {
        method: 'ethr',
        description: 'The ETHR DID method supports DIDs on the public and private Ethereum networks.',
        homepageUrl: 'https://github.com/uport-project/ethr-did-resolver/blob/develop/doc/did-method-spec.md',
        icons: [],
    };

    #didEthr;

    // NOTE: Use 'ethjs-provider-http' instead of 'web3' due to this issue: https://github.com/uport-project/ethr-did/issues/3#issuecomment-413908925
    #web3;

    constructor(web3) {
        this.#web3 = web3;

        // Registering Ethr Did To Resolver
        registerEthrDidToResolver.default({
            web3,
            registry: ETHR_REGISTRY_ADDRESS,
        });
    }

    async getDid(params) {
        const masterPrivateKey = await this.#getMasterPrivateKey(params);

        await this.#assureDidEthr(masterPrivateKey);

        return this.#didEthr.did;
    }

    async resolve(did) {
        // await this.#assureDidEthr();

        // Unfortunately, there is no method in ethr-did to return the whole DID Document, so we have to use another package

        // Resolving Ethr DID to DID document
        // This functions requires that registerEthrDidToResolver() must be run before running resolve()
        // So, we execute it in the contructor itself, avoiding running it every time we call resolve
        try {
            return await resolve.default(did);
        } catch (error) {
            throw new DidResolveError('ethr', error);
        }
    }

    async create(params, operations) {
        const masterKeyPair = EthrDID.createKeyPair();

        await this.#assureDidEthr(masterKeyPair);
        const ethrDid = this.#didEthr;

        operations(ethrDid);

        return {
            did: ethrDid.did,
            ethrDid,
            backupData: masterKeyPair,
        };
    }

    async update(did, params, operations) {
        const masterPrivateKey = await this.#getMasterPrivateKey(params);

        await this.#assureDidEthr(masterPrivateKey);
        const ethrDid = this.#didEthr;

        operations(ethrDid);

        const didDocument = await this.resolve(did);

        return didDocument;
    }

    async isPublicKeyValid(did, publicKeyId) {
        const { publicKey = [] } = await resolve.default(did);

        // Here publicKey[0].id is DID URL(with a #owner DID Fragment) and not just DID
        // Is publicKeyId just a DID or a DID URL?
        return (publicKey[0].id === publicKeyId);
    }

    // I don't think we need this, do we?
    #assureDidEthr = async (masterKeyPairOrKey) => {
        // Check if the passed param is a keyPair or a key
        let address;

        if (!masterKeyPairOrKey.address) {
            address = util.privateToAddress(masterKeyPairOrKey).toString('hex');
            masterKeyPairOrKey = {
                address,
                privateKey: masterKeyPairOrKey,
            };
        }

        if (!this.#didEthr) {
            this.#didEthr = new EthrDID({
                ...masterKeyPairOrKey,
                provider: this.#web3,
                registry: ETHR_REGISTRY_ADDRESS,
            });
        }
    };

    #getMasterPrivateKey = async (params) => {
        const { privateKey, mnemonic, seed /* Algorithm */ } = params || {};

        if (privateKey) {
            // Make sure that the private key is hex encoded
            const hexPrivateKey = privateKey.toString('hex');

            // Make sure that the privateKey is of right length
            switch (hexPrivateKey.length) {
            case 66:
                return hexPrivateKey;
            case 64:
                return `0x${hexPrivateKey}`;
            default:
                // Should we handle the inValid PrivateKey error here
                // or
                // let ethereumjs-wallet handle it?
            }
        }

        if (seed) {
            const hdwallet = hdkey.fromMasterSeed(seed);
            const path = "m/44'/60'/0'/0/0";
            const wallet = hdwallet.derivePath(path).getWallet();

            return `0x${wallet._privKey.toString('hex')}`;
        }

        if (mnemonic) {
            const seed = await bip39.mnemonicToSeed(mnemonic);
            const hdwallet = hdkey.fromMasterSeed(seed);
            const path = "m/44'/60'/0'/0/0";
            const wallet = hdwallet.derivePath(path).getWallet();

            return `0x${wallet._privKey.toString('hex')}`;
        }

        throw new MissingDidParameters('Please specify the privateKey, seed or mnemonic');
    }
}

const createEthr = (web3) => new Ethr(web3);

export default createEthr;
