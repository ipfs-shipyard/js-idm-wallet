import React from 'react';
import PropTypes from 'prop-types';
import './GenericCard.css';

const GenericCard = ({ className, children }) => {
    const classNames = !className ? 'card' : `card ${className}`;
    return (
        <div className={ classNames }>{ children }</div>
    )
}

GenericCard.propTypes = {
    className: PropTypes.string,
}

export default GenericCard;
