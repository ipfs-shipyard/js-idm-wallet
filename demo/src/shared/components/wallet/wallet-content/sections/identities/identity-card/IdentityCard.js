import React from 'react';
import PropTypes from 'prop-types';
import GenericCard from '../../../../../generic-card/GenericCard';
import './IdentityCard.css';

const IdentityCard = (props) => {
    console.log('Props', props);

    return (
        <GenericCard>
            <div></div>
        </GenericCard>
    );
}

IdentityCard.propTypes = {
    profile: PropTypes.object,
};

export default IdentityCard;
