import signal from 'pico-signals';
import { pick } from 'lodash';
import { generateKeyPair } from 'human-crypto-keys';
import { parseDid } from '../utils/did';
import { UnsupportedDidMethodPurposeError, UnknownIdentityError, IdentityAlreadyExistsError } from '../utils/errors';
import {
    createIdentity, removeIdentity, loadIdentities,
    assertCurrentDevice, assertBackupData, assertSchema,
    DEVICE_ID_PREFIX,
} from './identity';

const MASTER_KEY_ID = 'idm-master';

const mockIdentitySchema = {
    '@type': 'person',
    name: 'John Doe',
    image: 'https://images.unsplash.com/photo-1504455583697-3a9b04be6397',
};

class Identities {
    #storage;
    #didm;
    #orbitdb;

    #identities;
    #identitiesMap;
    #onChange = signal();

    constructor(storage, didm, orbitdb) {
        this.#storage = storage;
        this.#didm = didm;
        this.#orbitdb = orbitdb;

        window.foo = this;
    }

    get(id) {
        if (!this.#identitiesMap || !this.#identitiesMap[id]) {
            throw new UnknownIdentityError(id);
        }

        return this.#identitiesMap[id];
    }

    async list() {
        await this.#assureIdentities();

        return this.#identities;
    }

    async peek(didMethod, parameters) {
        this.#assertSupport(didMethod, 'getDid', 'resolve');

        await this.#assureIdentities();

        const did = await this.#didm.getDid(didMethod, parameters);
        const didDocument = await this.#didm.resolve(did);

        return {
            did: didDocument.id,
            didDocument,
            schema: mockIdentitySchema,
        };
    }

    async create(didMethod, parameters) {
        const { schema, deviceInfo } = parameters;

        this.#assertSupport(didMethod, 'create');
        assertSchema(schema);

        await this.#assureIdentities();

        const masterKeyPair = await generateKeyPair('rsa');
        const deviceKeyPair = pick(await generateKeyPair('rsa'), 'publicKey', 'privateKey');

        const currentDevice = { id: 'idm-device-genesis', ...deviceInfo, ...deviceKeyPair };
        const backupData = masterKeyPair;

        assertCurrentDevice(currentDevice);
        assertBackupData(backupData);

        const didDocument = await this.#didm.create(didMethod, { masterPrivateKey: masterKeyPair.privateKey }, (document) => {
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

        await this.#assureIdentities();

        const did = await this.#didm.getDid(didMethod, parameters);
        const exists = Object.values(this.#identitiesMap).some((identity) => identity.getDid() === did);

        if (exists) {
            throw new IdentityAlreadyExistsError();
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
            schema: mockIdentitySchema,
        }, this.#storage, this.#didm, this.#orbitdb);

        this.#identitiesMap[identity.id] = identity;
        this.#sortIdentities();

        this.#onChange.dispatch(this.#identities);

        return identity;
    }

    async remove(id, parameters) {
        await this.#assureIdentities();

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

    #assureIdentities = async () => {
        if (!this.#identitiesMap) {
            this.#identitiesMap = await loadIdentities(this.#storage, this.#didm, this.#orbitdb);
            console.log(this.#identitiesMap);
            this.#sortIdentities();
        }
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
