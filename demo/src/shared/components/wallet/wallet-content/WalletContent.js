import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Timer from '../../timer/Timer';
import { Sessions, Locker, Identities } from './sections';
import Section from './section';
import './WalletContent.css';

const links = {
    LOCKER: 'Locker',
    IDENTITIES: 'Identities',
    SESSIONS: 'Sessions',
};

class WalletContent extends Component {
    state = {
        currentLink: undefined,
    };

    componentDidMount() {
        const { wallet } = this.props;

        wallet.identities.load().then(() => console.log('Identities Loaded'));
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
        const { wallet } = this.props;

        return Object.values(links).map((name) => {
            const isCurrentLink = currentLink === name;
            const buttonClasses = `button ${isCurrentLink ? 'active' : '' }`;

            return (
                <button
                    name={ name }
                    className={ buttonClasses }                    
                    onClick={ this.handleLinkClick }>
                    <div>{ name }</div>
                </button>
            );
        });
    }

    renderContent() {
        const { currentLink } = this.state;
        const { wallet } = this.props;

        switch (currentLink) {
            case links.LOCKER:
                return (
                    <Section title="Locker">
                        <Locker wallet={ wallet } />
                    </Section>
                );
                break;
            case links.IDENTITIES:
                return (
                    <Section title="Identities">
                        <Identities wallet={ wallet } />
                    </Section>
                );
                break;
            case links.SESSIONS:
                return (
                    <Section title="Sessions">
                        <Sessions wallet={ wallet } />
                    </Section>
                );
                break;
            default:
                return (
                    <p>PEDRO!</p>
                );
                break;
        }
    }

    handleLinkClick = (event) => {
        event.currentTarget.name && this.setState({ currentLink: event.currentTarget.name });
    }
}

WalletContent.propTypes = {
    wallet: PropTypes.object.isRequired,
};

export default WalletContent;
