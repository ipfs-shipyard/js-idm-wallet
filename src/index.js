import Ipfs from 'ipfs';
import createSecret from './secret';
import createDidm from './didm';
import createStorage from './storage';
import createLocker from './locker';
import createIdentities from './identities';
import createSessions from './sessions';
import { keychainPass } from './utils/constants';
import { UnavailableIpfsError } from './utils/errors';

const createIpfs = (ipfs) => {
    if (ipfs) {
        if (typeof ipfs.isOnline === 'function' && !ipfs.isOnline()) {
            throw new UnavailableIpfsError();
        }

        return ipfs;
    }

    return new Promise((resolve, reject) => {
        const node = new Ipfs({
            pass: keychainPass,
            EXPERIMENTAL: {
                pubsub: true,
            },
            config: {
                Addresses: {
                    // WebSocket star possible servers:
                    // ws-star0.ams = "ws-star0.ams.dwebops.pub ws-star.discovery.libp2p.io"
                    // ws-star1.par = "ws-star1.par.dwebops.pub"
                    // ws-star2.sjc = "ws-star2.sjc.dwebops.pub"
                    Swarm: ['/dns4/ws-star1.par.dwebops.pub/tcp/443/wss/p2p-websocket-star'],
                },
            },
        });

        node.on('ready', () => resolve(node));
        node.on('error', (err) => reject(err));
    });
};

const createWallet = async (options) => {
    options = { ...options };

    const ipfsNode = await createIpfs(options.ipfs);

    const secret = createSecret();

    const didm = createDidm(ipfsNode);
    const storage = await createStorage(secret);
    const locker = await createLocker(storage, secret);
    const identities = createIdentities(storage, didm, ipfsNode);
    const sessions = await createSessions(storage, identities);

    return {
        didm,
        storage,
        locker,
        identities,
        sessions,
    };
};

export default createWallet;
