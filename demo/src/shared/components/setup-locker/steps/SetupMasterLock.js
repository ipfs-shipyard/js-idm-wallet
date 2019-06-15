import React, { Component } from 'react';
import PropTypes from 'prop-types';

const LOCK_TYPE = 'passphrase';

class SetupMasterLock extends Component {
    state = {
        validation: {},
        loading: false,
    };

    render() {
        const { loading, error } = this.state;

        if (loading) {
            return <div>...Loading...</div>;
        }

        if (error) {
            console.error(error);

            return <div>{ error.message }</div>;
        }

        return (
            <div>
                <h3>To setup your wallet please enter a passphrase as the Master Lock.</h3>
                <input
                    type="text"
                    id={ LOCK_TYPE }
                    name={ LOCK_TYPE }
                    onChange={ this.handleInputChange }
                    onKeyPress={ this.handleInputKeyPress } />
                { this.renderValidation() }
            </div>
        );
    }

    renderValidation = () => {
        const { validation } = this.state;

        if (!validation.error) {
            return;
        }

        return (
            <div>
                <span>⛔️ Passphrase is not strong enough ⛔️</span>
                { validation.warning &&
                    <div>
                        <h4>Warning ⚠️</h4>
                        <div>{ validation.warning.message }</div>
                    </div>
                }
                { validation.suggestions.length > 0 &&
                    <div>
                        <h4>Suggestions 📖</h4>
                        { validation.suggestions.map((suggestion, index) => <div key={ index }>{ suggestion.message }</div>)}
                    </div>
                }
            </div>
        );
    };

    validateStrength = (lockType, solution) => {
        const { locker } = this.props;

        locker.getLock(lockType).validate(solution)
        .then((validation) => this.setState({ validation }))
        .catch((error) => this.setState({
            validation: {
                score: error.score,
                suggestions: error.suggestions,
                warning: error.warning,
                error: true,
            },
        }));
    };

    setLock = (lockType, solution) => {
        const { locker, onComplete } = this.props;

        this.setState({ loading: true });

        locker.getLock(lockType).enable(solution)
        .then(onComplete)
        .catch((error) => this.setState({ loading: false, error }));
    };

    handleInputChange = (event) => {
        this.inputValue = event.target.value;
        this.validateStrength(LOCK_TYPE, this.inputValue);
    };

    handleInputKeyPress = (event) => {
        const { validation: { error } } = this.state;

        if (event.charCode === 13 && !error && this.inputValue) {
            this.setLock(LOCK_TYPE, this.inputValue);
        }
    };
}

SetupMasterLock.propTypes = {
    locker: PropTypes.object.isRequired,
    onComplete: PropTypes.func.isRequired,
};

export default SetupMasterLock;
