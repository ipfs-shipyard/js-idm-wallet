import BaseError from './base';

export class UnsupportedCypherAlgorithm extends BaseError {
    constructor(algorithm) {
        super(`Unsupported cypher algorithm: ${algorithm}`, 'UNSUPPORTED_CYPHER_ALGORITHM');
    }
}
