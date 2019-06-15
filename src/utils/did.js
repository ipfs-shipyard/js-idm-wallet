import didUri from 'did-uri';
import { InvalidDidError, InvalidDidUrlError, InvalidDidParts } from './errors/did';

export const parseDid = (did) => {
    let parsed;

    try {
        parsed = didUri.parse(did);
    } catch (err) {
        throw new InvalidDidError(err.message);
    }

    if (parsed.did !== did) {
        throw new InvalidDidError(`It seems that ${did} is a DID URL and not a DID`);
    }

    return parsed;
};

export const parseDidUrl = (did) => {
    let parsed;

    try {
        parsed = didUri.parse(did);
    } catch (err) {
        throw new InvalidDidUrlError(err.message);
    }

    return parsed;
};

export const formatDid = (parts) => {
    try {
        return didUri.format(parts);
    } catch (err) {
        throw new InvalidDidParts(err.message);
    }
};
