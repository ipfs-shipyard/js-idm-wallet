import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { omit, capitalize } from 'lodash';
import GenericCard from '../../../../../generic-card/GenericCard';
import './IdentityCard.css';

const defaultAvatarUrl = 'https://iupac.org/wp-content/uploads/2018/05/default-avatar.png';

class IdentityCard extends Component {
    state = { details: undefined };

    constructor(props) {
        super(props);

        this.state.details = props.identity.profile.getDetails();
        props.identity.profile.onChange(this.handleDetailsChange);
    }

    render() {
        const { details: { name, image, ...rest } } = this.state;
        const filteredDetails = omit(rest, ['@context', '@type', 'identifier']);
        const imgUrl = image || defaultAvatarUrl;

        return (
            <GenericCard className="genericCardContainer">
                <div className="header">
                    <img src={ imgUrl } alt="avatar" />
                    <span className="name">{ name }</span>
                </div>
                { Object.entries(filteredDetails).map(([key, value], index) => (
                    <span key={ index } className="info">{ `${capitalize(key)}: ${value}` }</span>
                )) }
            </GenericCard>
        )
    }

    handleDetailsChange = () => {
        this.setState({ details: this.props.identity.profile.getDetails() });
    }
}

IdentityCard.propTypes = {
    identity: PropTypes.object.isRequired,
};

export default IdentityCard;
