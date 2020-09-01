import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Timer from '../../timer/Timer';
import { Sessions, Locker, Identities } from './sections';
import Section from './section';
import './WalletContent.css';

const links = {
    IDENTITIES: 'Identities',
    LOCKER: 'Locker',
    SESSIONS: 'Sessions',
};

class WalletContent extends Component {
    state = {
        currentLink: undefined,
        identitiesList: undefined,
    };

    componentDidMount() {
        const { wallet } = this.props;

        wallet.identities.onChange(this.handleIdentitiesChange);
        wallet.identities.load().then(this.handleIdentitiesChange);
    }

    render() {
        const { wallet } = this.props;

        return (
            <div className="WalletContent">
                <div className="menu">
                    <h1>IDM</h1>
                    <Timer className="timer" locker={ wallet.locker } />
                    <div className="links">
                        { this.renderLinks() }
                    </div>
                </div>
                <div className="content">
                   { this.renderContent() }
                </div>
            </div>
        );
    }

    renderLinks() {
        const { currentLink } = this.state;

        return Object.values(links).map((name, index) => {
            const isCurrentLink = currentLink === name;
            const buttonClasses = `button ${isCurrentLink ? 'active' : '' }`;

            return (
                <button
                    key={ index }
                    name={ name }
                    className={ buttonClasses }
                    onClick={ this.handleLinkClick }>
                    <div>{ name }</div>
                </button>
            );
        });
    }

    renderContent() {
        const { currentLink, identitiesList } = this.state;
        const { wallet } = this.props;

        switch (currentLink) {
            case links.LOCKER:
                return (
                    <Section title="Locker">
                        <Locker wallet={ wallet } />
                    </Section>
                );
            case links.IDENTITIES:
                return (
                    <Section title="Identities">
                        <Identities
                            identities={ identitiesList }
                            wallet={ wallet } />
                    </Section>
                );
            case links.SESSIONS:
                return (
                    <Section title="Sessions">
                        <Sessions wallet={ wallet } />
                    </Section>
                );
            default:
                return (
                    <p>WELCOME TO IDM UI!</p>
                );
        }
    }

    handleLinkClick = (event) => {
        event.currentTarget.name && this.setState({ currentLink: event.currentTarget.name });
    }

    handleIdentitiesChange = (idList) => {
        this.setState({ identitiesList: idList });
    };
}

WalletContent.propTypes = {
    wallet: PropTypes.object.isRequired,
};

export default WalletContent;
