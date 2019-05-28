import React, { Component } from 'react';
import PropTypes from 'prop-types';

import Timer from '../../timer/Timer';
import { Sessions, Locker, Identities } from './sections';

import './WalletContent.css';

class WalletContent extends Component {
    componentDidMount() {
        const { wallet } = this.props;

        wallet.identities.load().then(() => console.log('Identities Loaded'));
    }

    render() {
        const { wallet } = this.props;

        return (
            <div className="WalletContent">
                <div className="leftBar">
                </div>
                <div className="container">
                    <div className="top">
                        <Timer className="timer" locker={ wallet.locker } />
                    </div>
                    <div className="bottom">
                        <Locker wallet={ wallet } />
                        <Identities wallet={ wallet } />
                        <Sessions wallet={ wallet } />
                    </div>
                </div>
            </div>
        );
    }
}

WalletContent.propTypes = {
    wallet: PropTypes.object.isRequired,
};

export default WalletContent;
