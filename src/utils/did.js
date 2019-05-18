import { InvalidDidError } from './errors';

export const parseDid = (did) => {
    let match;

    if (typeof did === 'string') {
        match = did.match(/did:(\w+):(\w+).*?(?:#(.*))?/);
    }

    if (!match) {
        throw new InvalidDidError(did);
    }

    return { method: match[1], identifier: match[2], fragment: match[3] };
};

export const isDidValid = (did) => {
    try {
        parseDid(did);

        return true;
    } catch (err) {
        return false;
    }
};
