import signal from 'pico-signals';
import { pick } from 'lodash';
import { generateKeyPair } from 'human-crypto-keys';
import { parseDid } from '../utils/did';
import {
    UnsupportedDidMethodPurposeError, IdentitiesNotLoadedError, UnknownIdentityError, IdentityAlreadyExistsError,
} from '../utils/errors';
import {
    createIdentity, removeIdentity, loadIdentities, peekIdentitySchema,
    assertCurrentDevice, assertBackupData, assertSchema,
    DEVICE_ID_PREFIX,
} from './identity';

const MASTER_KEY_ID = 'idm-master';

class Identities {
    #storage;
    #didm;
    #orbitdb;

    #identities;
    #identitiesMap;
    #identitiesLoad;
    #onChange = signal();

    constructor(storage, didm, orbitdb) {
        this.#storage = storage;
        this.#didm = didm;
        this.#orbitdb = orbitdb;
    }

    get(id) {
        if (!this.#identitiesMap || !this.#identitiesMap[id]) {
            throw new UnknownIdentityError(id);
        }

        return this.#identitiesMap[id];
    }

    list() {
        if (!this.#identities) {
            throw new IdentitiesNotLoadedError();
        }

        return this.#identities;
    }

    async load() {
        if (this.#identitiesMap) {
            return;
        }

        if (!this.#identitiesLoad) {
            this.#identitiesLoad = this.#assureIdentities().catch((error) => {
                this.#identities = undefined;
                this.#identitiesMap = undefined;
                this.#identitiesLoad = undefined;

                throw error;
            });
        }

        return this.#identitiesLoad;
    }

    async peek(didMethod, parameters) {
        this.#assertSupport(didMethod, 'getDid', 'resolve');

        await this.load();

        const did = await this.#didm.getDid(didMethod, parameters);
        const didDocument = await this.#didm.resolve(did);
        const identity = this.#getIdentityByDid(did);
        const schema = identity ? identity.profile.toSchema() : await peekIdentitySchema(did, this.#orbitdb);

        return {
            did,
            didDocument,
            schema,
        };
    }

    async create(didMethod, parameters) {
        const { schema, deviceInfo } = parameters;

        this.#assertSupport(didMethod, 'create');
        assertSchema(schema);

        await this.load();

        const masterKeyPair = await generateKeyPair('rsa');
        const deviceKeyPair = pick(await generateKeyPair('rsa'), 'publicKey', 'privateKey');

        const currentDevice = { id: 'idm-device-genesis', ...deviceInfo, ...deviceKeyPair };
        const backupData = masterKeyPair;

        assertCurrentDevice(currentDevice);
        assertBackupData(backupData);

        const didDocument = await this.#didm.create(didMethod, { privateKey: masterKeyPair.privateKey }, (document) => {
            document.addPublicKey({
                id: MASTER_KEY_ID,
                type: 'RsaVerificationKey2018',
                publicKeyPem: masterKeyPair.publicKey,
            });

            const documentDeviceKey = document.addPublicKey({
                type: 'RsaVerificationKey2018',
                publicKeyPem: deviceKeyPair.publicKey,
            }, { idPrefix: DEVICE_ID_PREFIX });

            currentDevice.id = parseDid(documentDeviceKey.id).fragment;
        });

        const identity = await createIdentity({
            did: didDocument.id,
            currentDevice,
            backupData,
            schema,
        }, this.#storage, this.#didm, this.#orbitdb);

        this.#identitiesMap[identity.getId()] = identity;
        this.#sortIdentities();

        this.#onChange.dispatch(this.#identities);

        return identity;
    }

    async import(didMethod, parameters) {
        const { deviceInfo } = parameters;

        this.#assertSupport(didMethod, 'getDid', 'update');

        await this.load();

        const did = await this.#didm.getDid(didMethod, parameters);

        if (this.#getIdentityByDid(did)) {
            throw new IdentityAlreadyExistsError(did);
        }

        const deviceKeyPair = pick(await generateKeyPair('rsa'), 'publicKey', 'privateKey');

        const currentDevice = { id: 'idm-device-genesis', ...deviceInfo, ...deviceKeyPair };

        assertCurrentDevice(currentDevice);

        const didDocument = await this.#didm.update(did, parameters, (document) => {
            const documentDeviceKey = document.addPublicKey({
                type: 'RsaVerificationKey2018',
                publicKeyPem: deviceKeyPair.publicKey,
            }, { idPrefix: DEVICE_ID_PREFIX });

            currentDevice.id = parseDid(documentDeviceKey.id).fragment;
        });

        const identity = await createIdentity({
            did: didDocument.id,
            currentDevice,
        }, this.#storage, this.#didm, this.#orbitdb);

        this.#identitiesMap[identity.id] = identity;
        this.#sortIdentities();

        this.#onChange.dispatch(this.#identities);

        return identity;
    }

    async remove(id, parameters) {
        await this.load();

        const identity = this.get(id);
        const identityDid = identity.getDid();
        const identityDidMethod = parseDid(identityDid).method;

        this.#assertSupport(identityDidMethod, 'update');

        await this.#didm.update(identityDid, parameters, (document) => {
            document.revokePublicKey(identity.devices.getCurrent().id);
        });

        await removeIdentity(id, this.#storage, this.#didm, this.#orbitdb);

        delete this.#identitiesMap[id];
        this.#sortIdentities();
    }

    onChange(fn) {
        return this.#onChange.add(fn);
    }

    #getIdentityByDid = (did) =>
        this.#identities.find((identity) => identity.getDid() === did);

    #assureIdentities = async () => {
        this.#identitiesMap = await loadIdentities(this.#storage, this.#didm, this.#orbitdb);

        this.#sortIdentities();
    }

    #sortIdentities = () => {
        const identities = Object.values(this.#identitiesMap);

        // Sort identities from older to new
        this.#identities = identities.sort((identity1, identity2) => identity1.getAddedAt() - identity2.getAddedAt());
    }

    #assertSupport = (didMethod, ...purposes) => {
        purposes.forEach((purpose) => {
            if (!this.#didm.isSupported(didMethod, purpose)) {
                throw new UnsupportedDidMethodPurposeError(didMethod, purpose);
            }
        });
    }
}

const createIdentities = (storage, didm, orbitdb) => new Identities(storage, didm, orbitdb);

export default createIdentities;
