import React, { Component } from 'react';
import PropTypes from 'prop-types';

const TIME_BASE = 60 * 1000;

class SetupIdleTimer extends Component {
    state = {
        loading: false,
    };

    render() {
        const { loading } = this.state;

        if (loading) {
            return <div>...Loading...</div>;
        }

        return (
            <div>
                <h3>Setup an expiration lock in minutes</h3>
                <input
                    type="number"
                    id="expirationTime"
                    name="expirationTime"
                    onChange={ this.handleInputChange }
                    onKeyPress={ this.handleInputKeyPress } />
            </div>
        );
    }

    setMaxTime = (value) => {
        const { locker, onComplete } = this.props;

        locker.idleTimer.setMaxTime(value)
        .then(onComplete)
        .catch((error) => this.setState({ loading: false, error }));
    };

    handleInputChange = (event) => {
        this.inputValue = event.target.value;
    };

    handleInputKeyPress = (event) => {
        if (event.charCode === 13) {
            this.setMaxTime(Math.abs(this.inputValue * TIME_BASE));
        }
    };
}

SetupIdleTimer.propTypes = {
    locker: PropTypes.object.isRequired,
    onComplete: PropTypes.func.isRequired,
};

export default SetupIdleTimer;
