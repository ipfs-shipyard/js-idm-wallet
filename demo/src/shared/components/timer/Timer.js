import React, { Component } from 'react';
import PropTypes from 'prop-types';

class Timer extends Component {
    state = {
        time: 0,
    };

    componentDidMount() {
        this.getRemainingTime();
    }

    componentWillUnmount() {
        clearTimeout(this.idleTimeout);
    }

    render() {
        const { className } = this.props;

        return (
            <div className={ className }>
                <span>{ this.getTimeString() }</span>
            </div>
        );
    }

    getTimeString() {
        const minutes = Math.trunc(this.state.time / (60 * 1000)).toString()
        .padStart(2, '0');
        const seconds = Math.trunc((this.state.time % (60 * 1000)) / 1000).toString()
        .padStart(2, '0');

        return `${minutes}:${seconds}`;
    }

    getRemainingTime = () => {
        const { locker } = this.props;

        this.idleTimeout = setTimeout(this.getRemainingTime, 250);

        this.setState({ time: locker.idleTimer.getRemainingTime() });
    };
}

Timer.propTypes = {
    locker: PropTypes.object.isRequired,
    className: PropTypes.string,
};

export default Timer;
