import pReduce from 'p-reduce';
import signal from 'pico-signals';
import { generateKeyPair } from 'human-crypto-keys';

import { createIdentity, restoreIdentity, removeIdentity, IDENTITY_KEY_PREFIX } from './identity';
import { assertCurrentDevice, DEVICE_ID_PREFIX } from './identity/devices';
import { assertBackupData } from './identity/backup';
import { assertProfile } from './identity/profile';
import { parseDid } from '../utils';
import { UnsupportedDidMethodPurposeError, UnknownIdentity } from '../utils/errors';

const MASTER_KEY_ID = 'idm-master';

const mockIdentitySchema = {
    '@type': 'person',
    name: 'John Doe',
    image: 'https://images.unsplash.com/photo-1504455583697-3a9b04be6397',
};

class Identities {
    #storage;
    #didm;

    #identities;
    #onChange = signal();

    constructor(storage, didm) {
        this.#storage = storage;
        this.#didm = didm;
    }

    get(id) {
        if (!this.#identities || !this.#identities[id]) {
            throw new UnknownIdentity(id);
        }

        return this.#identities[id];
    }

    async list() {
        await this.#assureIdentities();

        return Object.values(this.#identities);
    }

    async peek(didMethod, parameters) {
        const { mnemonic } = parameters;

        this.#assertSupport(didMethod, 'getDid', 'resolve');

        await this.#assureIdentities();

        const did = await this.#didm.getDid(didMethod, { mnemonic });
        const didDocument = await this.#didm.resolve(did);

        return {
            did: didDocument.id,
            schema: mockIdentitySchema,
        };
    }

    async create(didMethod, parameters) {
        const { schema, device } = parameters;

        this.#assertSupport(didMethod, 'create');

        assertProfile(schema);

        await this.#assureIdentities();

        const masterKeyPair = await generateKeyPair('rsa');
        const deviceKeyPair = await generateKeyPair('rsa');

        const currentDevice = { id: 'idm-device-temp', ...device, ...deviceKeyPair };
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

            currentDevice.id = documentDeviceKey.id;
        });

        const identity = await createIdentity({
            did: didDocument.id,
            currentDevice,
            backupData,
            schema,
        }, this.#storage);

        this.#identities[identity.getId()] = identity;

        this.#onChange.dispatch(Object.values(this.#identities));

        return identity;
    }

    async import(didMethod, parameters) {
        const { mnemonic, device } = parameters;

        this.#assertSupport(didMethod, 'getDid', 'update');

        await this.#assureIdentities();

        const deviceKeyPair = await generateKeyPair('rsa');

        const currentDevice = { id: 'idm-device-temp', ...device, ...deviceKeyPair };

        assertCurrentDevice(currentDevice);

        const did = await this.#didm.getDid(didMethod, { mnemonic });

        const didDocument = await this.#didm.update(did, { mnemonic }, (document) => {
            const documentDeviceKey = document.addPublicKey({
                type: 'RsaVerificationKey2018',
                publicKeyPem: deviceKeyPair.publicKey,
            }, { idPrefix: DEVICE_ID_PREFIX });

            currentDevice.id = documentDeviceKey.id;
        });

        const identity = await createIdentity({
            did: didDocument.id,
            currentDevice,
            schema: mockIdentitySchema,
        }, this.#storage);

        this.#identities[identity.id] = identity;

        this.#onChange.dispatch(Object.values(this.#identities));

        return identity;
    }

    async remove(id, parameters) {
        const { mnemonic } = parameters;

        await this.#assureIdentities();

        const identity = this.get(id);
        const identityDid = identity.getDid();
        const identityDidMethod = parseDid(identityDid).method;

        this.#assertSupport(identityDidMethod, 'update');

        await this.#didm.update(identityDid, { mnemonic }, (document) => {
            document.revokePublicKey(identity.devices.getCurrent().id);
        });

        await removeIdentity(id, this.#storage);

        delete this.#identities[id];
    }

    onChange(fn) {
        return this.#onChange.add(fn);
    }

    #readIdentities = async () => {
        const identitiesKeys = await this.#storage.list({
            gte: IDENTITY_KEY_PREFIX,
            lte: `${IDENTITY_KEY_PREFIX}\xFF`,
            values: false,
        });

        const identities = await pReduce(identitiesKeys, async (acc, key) => {
            const identity = await restoreIdentity(key, this.#storage);

            return Object.assign(acc, { [identity.getId()]: identity });
        }, {});

        return identities;
    }

    #assureIdentities = async () => {
        if (!this.#identities) {
            this.#identities = await this.#readIdentities();
        }
    }

    #assertSupport = (didMethod, ...purposes) => {
        purposes.forEach((purpose) => {
            if (!this.#didm.isSupported(didMethod, purpose)) {
                throw new UnsupportedDidMethodPurposeError(didMethod, purpose);
            }
        });
    }
}

const createIdentities = (storage, didm) => new Identities(storage, didm);

export default createIdentities;
