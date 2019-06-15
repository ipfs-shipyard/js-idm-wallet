import React, { Component } from 'react';
import PropTypes from 'prop-types';
import SetupMasterLock from './steps/SetupMasterLock';
import SetupIdleTimer from './steps/SetupIdleTimer';

class SetupLocker extends Component {
    state = {
        step: 1,
    };

    render() {
        return (
            <div>
                <h1>Setup Locker</h1>
                { this.renderStep() }
            </div>
        );
    }

    renderStep() {
        const { step } = this.state;
        const { locker } = this.props;

        switch (step) {
        case 1:
            return <SetupMasterLock locker={ locker } onComplete={ this.handleStepComplete } />;
        case 2:
            return <SetupIdleTimer locker={ locker } onComplete={ this.handleStepComplete } />;
        default:
            return null;
        }
    }

    handleStepComplete = () => {
        const { step } = this.state;
        const { onComplete } = this.props;

        if (step === 2) {
            return onComplete();
        }

        this.setState({ step: step + 1 });
    };
}

SetupLocker.propTypes = {
    locker: PropTypes.object.isRequired,
    onComplete: PropTypes.func.isRequired,
};

export default SetupLocker;
