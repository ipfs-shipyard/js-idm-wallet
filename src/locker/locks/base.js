export default class BaseLock {
    #master;

    constructor({ master = false }) {
        this.#master = !!master;
    }

    isMaster() {
        return this.#master;
    }

    async enable(params) {
        await this.#assertDisabled();
        await this.validate(params);
    }

    async disable() {
        await this.#assertEnabled();
        this.#assertNotMaster();
    }

    async update(newParams, input) {
        await this.#assertEnabled();
        await this.validate(newParams);

        // Be sure that the user is able to unlock if this is the master lock
        if (this.#master) {
            await this.unlock(input);
        }
    }

    async unlock() {
        await this.#assertEnabled();
    }

    #assertNotMaster = () => {
        if (this.#master) {
            throw Object.assign(new Error('Invalid operation on the master lock'), { code: 'INVALID_OPERATION' });
        }
    }

    #assertEnabled = async () => {
        const enabled = await this.isEnabled();

        if (!enabled) {
            throw Object.assign(new Error('This lock must be enabled'), { code: 'NOT_ENABLED' });
        }
    }

    #assertDisabled = async () => {
        const enabled = await this.isEnabled();

        if (enabled) {
            throw Object.assign(new Error('This lock must be disabled'), { code: 'NOT_DISABLED' });
        }
    }
}
