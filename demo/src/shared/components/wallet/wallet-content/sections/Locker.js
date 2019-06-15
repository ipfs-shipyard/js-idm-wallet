import React, { Component } from 'react';
import PropTypes from 'prop-types';

class Locker extends Component {
    render() {
        return (
            <div className="section">
                <h4>Locker</h4>
                <div className="content">
                    <div className="option">
                        <span>Lock Locker</span>
                        <button onClick={ this.handleLockLocker }>Lock</button>
                    </div>
                    <div className="option">
                        <span>Timer Restart</span>
                        <button onClick={ this.handleRestartTimer }>Restart</button>
                    </div>
                    <div className="option">
                        <span>Timer Set MaxTime</span>
                        <input
                            type="number"
                            onChange={ this.handleMaxTimeInputChange } />
                        <button onClick={ this.handleMaxTimeInputSubmit }>Submit</button>
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

        locker.idleTimer.restart();
    };

    handleMaxTimeInputChange = (event) => {
        this.maxInputTime = event.target.value;
    };

    handleMaxTimeInputSubmit = () => {
        const { wallet: { locker } } = this.props;

        if (this.maxInputTime > 0) {
            locker.idleTimer.setMaxTime(this.maxInputTime * 60 * 1000);
        }
    };
}

Locker.propTypes = {
    wallet: PropTypes.object.isRequired,
};

export default Locker;
