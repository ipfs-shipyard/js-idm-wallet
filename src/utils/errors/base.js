class BaseError extends Error {
    constructor(message, code, props) {
        super(message);

        Object.assign(this, {
            ...props,
            code,
            name: this.constructor.name,
        });

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);

            return;
        }

        this.stack = (new Error(message)).stack;
    }
}

export default BaseError;
