import React, { Component } from 'react';
import PropTypes from 'prop-types';

import Timer from '../../timer/Timer';

import './WalletContent.css';

class WalletContent extends Component {
    render() {
        const { wallet: { locker } } = this.props;

        return (
            <div className="WalletContent">
                <div className="leftBar">
                </div>
                <div className="container">
                    <div className="top">
                        <Timer className="timer" locker={ locker } />
                    </div>
                    <div className="bottom">
                        <div className="section">
                            <h4>Locker</h4>
                            <div className="content">
                                <div className="option">
                                    <span>Lock Locker</span>
                                    <button onClick={ this.handleLockLocker }>Lock</button>
                                </div>
                            </div>
                        </div>
                        <div className="section">
                            <h4>Timer</h4>
                            <div className="content">
                                <div className="option">
                                    <span>Restart</span>
                                    <button onClick={ this.handleRestartTimer }>Restart</button>
                                </div>
                                <div className="option">
                                    <span>Set MaxTime</span>
                                    <input
                                        type="number"
                                        onChange={ this.handleMaxTimeInputChange } />
                                    <button onClick={ this.handleMaxTimeInputSubmit }>Submit</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    handleLockLocker = () => {
        const { wallet: { locker } } = this.props;

        locker.lock();
    };

    handleRestartTimer = () => {
        const { wallet: { locker } } = this.props;

        locker.getIdleTimer().restart();
    };

    handleMaxTimeInputChange = (event) => {
        this.maxInputTime = event.target.value;
    };

    handleMaxTimeInputSubmit = () => {
        const { wallet: { locker } } = this.props;

        if (this.maxInputTime > 0) {
            locker.getIdleTimer().setMaxTime(this.maxInputTime * 60 * 1000);
        }
    };
}

WalletContent.propTypes = {
    wallet: PropTypes.object.isRequired,
};

export default WalletContent;
