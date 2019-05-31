import signal from 'pico-signals';
import { parseDid } from '../utils/did';
import {
    UnsupportedDidMethodPurposeError,
    IdentitiesNotLoadedError,
    UnknownIdentityError,
    IdentityAlreadyExistsError,
} from '../utils/errors';
import * as identityFns from './identity';

class Identities {
    #storage;
    #didm;
    #ipfs;

    #identitiesList;
    #identitiesMap;
    #identitiesLoad;
    #onChange = signal();

    constructor(storage, didm, ipfs) {
        this.#storage = storage;
        this.#didm = didm;
        this.#ipfs = ipfs;
    }

    isLoaded() {
        return !!this.#identitiesMap;
    }

    async load() {
        if (!this.#identitiesLoad) {
            this.#identitiesLoad = identityFns.loadIdentities(this.#storage, this.#didm, this.#ipfs);
        }

        try {
            this.#identitiesMap = await this.#identitiesLoad;
        } catch (err) {
            this.#identitiesLoad = undefined;
            throw err;
        }

        this.#buildIdentitiesList();

        return this.#identitiesList;
    }

    has(id) {
        return Boolean(this.#identitiesMap[id]);
    }

    get(id) {
        if (!this.#identitiesMap) {
            throw new IdentitiesNotLoadedError();
        }

        if (!this.#identitiesMap[id]) {
            throw new UnknownIdentityError(id);
        }

        return this.#identitiesMap[id];
    }

    list() {
        if (!this.#identitiesMap) {
            throw new IdentitiesNotLoadedError();
        }

        return this.#identitiesList;
    }

    async peek(didMethod, params) {
        this.#assertDidmSupport(didMethod, 'getDid', 'resolve');

        await this.load();

        const did = await this.#didm.getDid(didMethod, params);
        const didDocument = await this.#didm.resolve(did);
        const identity = this.#getIdentityByDid(did);

        const profileDetails = identity ? identity.profile.getDetails() : await identityFns.peekProfileDetails(did, this.#ipfs);

        return {
            did,
            didDocument,
            profileDetails,
        };
    }

    async create(didMethod, params) {
        const { profileDetails, deviceInfo } = params || {};

        this.#assertDidmSupport(didMethod, 'create');
        identityFns.assertProfileDetails(profileDetails);
        identityFns.assertDeviceInfo(deviceInfo);

        await this.load();

        const { currentDevice, didPublicKey } = await identityFns.generateCurrentDevice(deviceInfo);

        const { did, backupData } = await this.#didm.create(didMethod, params, (document) => {
            document.addPublicKey(didPublicKey);
        });

        const identity = await identityFns.createIdentity({
            did,
            currentDevice,
            backupData,
            profileDetails,
        }, this.#storage, this.#didm, this.#ipfs);

        this.#identitiesMap[identity.getId()] = identity;
        this.#updateIdentitiesList();

        return identity;
    }

    async import(didMethod, params) {
        const { deviceInfo } = params || {};

        this.#assertDidmSupport(didMethod, 'getDid', 'update');
        identityFns.assertDeviceInfo(deviceInfo);

        await this.load();

        const did = await this.#didm.getDid(didMethod, params);

        if (this.#getIdentityByDid(did)) {
            throw new IdentityAlreadyExistsError(did);
        }

        const { currentDevice, didPublicKey } = await identityFns.generateCurrentDevice(deviceInfo);

        await this.#didm.update(did, params, (document) => {
            document.addPublicKey(didPublicKey);
        });

        const identity = await identityFns.createIdentity({
            did,
            currentDevice,
        }, this.#storage, this.#didm, this.#ipfs);

        this.#identitiesMap[identity.id] = identity;
        this.#updateIdentitiesList();

        return identity;
    }

    async remove(id, params) {
        await this.load();

        const identity = this.get(id);
        const did = identity.getDid();
        const didMethod = parseDid(did).method;

        this.#assertDidmSupport(didMethod, 'update');

        await this.#didm.update(did, params, (document) => {
            document.revokePublicKey(identity.devices.getCurrent().id);
        });

        await identityFns.removeIdentity(id, this.#storage, this.#didm, this.#ipfs);

        delete this.#identitiesMap[id];
        this.#updateIdentitiesList();
    }

    onChange(fn) {
        return this.#onChange.add(fn);
    }

    #getIdentityByDid = (did) =>
        this.#identitiesList.find((identity) => identity.getDid() === did);

    #assertDidmSupport = (didMethod, ...purposes) => {
        purposes.forEach((purpose) => {
            if (!this.#didm.isSupported(didMethod, purpose)) {
                throw new UnsupportedDidMethodPurposeError(didMethod, purpose);
            }
        });
    }

    #buildIdentitiesList = () => {
        this.#identitiesList = Object.values(this.#identitiesMap);
        this.#identitiesList.sort((identity1, identity2) => identity1.getAddedAt() - identity2.getAddedAt());
    }

    #updateIdentitiesList = () => {
        this.#buildIdentitiesList();
        this.#onChange.dispatch(this.#identitiesList);
    }
}

const createIdentities = (storage, didm, ipfs) => new Identities(storage, didm, ipfs);

export default createIdentities;
