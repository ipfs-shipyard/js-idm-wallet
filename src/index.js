import Ipfs from 'ipfs';
import createStorage from './storage';
import createLocker from './locker';
import createDid from './did';
import { keychainPass } from './utils/constants';
import { UnavailableIpfsError } from './utils/errors';

const createIpfs = (ipfs) => {
    if (ipfs) {
        if (!ipfs.isOnline || !ipfs.isOnline()) {
            throw new UnavailableIpfsError();
        }

        return ipfs;
    }

    return new Promise((resolve, reject) => {
        const node = new Ipfs({ pass: keychainPass });

        node.on('ready', () => resolve(node));
        node.on('error', (err) => reject(err));
    });
};

const createWallet = async (options) => {
    const { ipfs } = { ...options };

    const ipfsNode = await createIpfs(ipfs);

    const storage = await createStorage();
    const locker = await createLocker(storage);
    const did = createDid(ipfsNode);

    return {
        storage,
        locker,
        did,
    };
};

export default createWallet;
