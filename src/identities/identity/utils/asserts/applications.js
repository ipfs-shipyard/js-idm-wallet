import { InvalidAppPropertyError } from '../../../../utils/errors';

export const assertApplication = (app) => {
    const { id, name, homepageUrl, iconUrl } = app;

    if (!id || typeof id !== 'string') {
        throw new InvalidAppPropertyError('id', id);
    }

    if (!name || typeof name !== 'string') {
        throw new InvalidAppPropertyError('name', name);
    }

    if (!homepageUrl || typeof homepageUrl !== 'string') {
        throw new InvalidAppPropertyError('homepageUrl', homepageUrl);
    }

    if (!iconUrl || typeof iconUrl !== 'string') {
        throw new InvalidAppPropertyError('icon', iconUrl);
    }
};
