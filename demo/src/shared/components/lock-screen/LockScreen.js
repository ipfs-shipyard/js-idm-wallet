import React, { Component } from 'react';
import PropTypes from 'prop-types';

const LOCK_TYPE = 'passphrase';

class LockScreen extends Component {
    state = {
        loading: false,
        error: undefined,
    };

    render() {
        const { loading, error } = this.state;
    
        if (loading) {
            return <div>...Loading...</div>;
        }

        return (
            <div>
                <h1>Lock Screen</h1>
                <input
                    type="text" 
                    id={ LOCK_TYPE }
                    name={ LOCK_TYPE }
                    onChange={ this.handleInputChange }
                    onKeyPress={ this.handleInputKeyPress } />
                { error && <p>{ `⛔️${error.message} ⛔️` }</p> }
            </div>
        );
    }

    handleInputChange = (event) => {
        this.inputValue = event.target.value;
    };

    handleInputKeyPress = (event) => {
        if (event.charCode === 13) {
            this.unlock(LOCK_TYPE, this.inputValue);
        }
    };

    unlock = (lockType, challenge) => {
        const { locker } = this.props;

        this.setState({ loading: true });

        locker.getLock(lockType).unlock(challenge)
            .catch((error) => this.setState({ loading: false, error }));
    };
}

LockScreen.propTyes = {
    locker: PropTypes.object,
};

export default LockScreen;