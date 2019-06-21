import createIpfsClient from 'ipfs-http-client';
import { INFURA_IPFS_ENDPOINT } from './constants/infura';

const endpointUrl = new URL(INFURA_IPFS_ENDPOINT);

export default createIpfsClient({
    host: endpointUrl.hostname,
    port: endpointUrl.port,
    protocol: endpointUrl.protocol.slice(0, -1),
    'api-url': endpointUrl.pathname,
});
