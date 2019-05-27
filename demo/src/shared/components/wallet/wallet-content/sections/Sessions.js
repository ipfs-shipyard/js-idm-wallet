import React, { Component } from 'react';
import PropTypes from 'prop-types';

const mockApp = {
    id: '1a2b3c',
    name: 'MyDapp',
    homepageUrl: 'http://mydapp.com',
    iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/f4/Icon_1_%28set_orange%29.png',
};

class Sessions extends Component {
    render() {
        return (
            <div className="section">
                <h4>Sessions</h4>
                <div className="content">
                    <div className="option">
                        <span>Create</span>
                        <input
                            type="text"
                            placeholder="identityId"
                            onChange={ this.handleCreateChange } />
                        <button onClick={ this.handleCreateSubmit }>Create</button>
                    </div>
                    <div className="option">
                        <span>Destroy</span>
                        <input
                            type="text"
                            onChange={ this.handleDestroyChange } />
                        <button onClick={ this.handleDestroySubmit }>Destroy</button>
                    </div>
                </div>
            </div>
        );
    }

    handleCreateChange = (event) => {
        this.createIdentityId = event.target.value;
    };

    handleCreateSubmit = () => {
        const { wallet } = this.props;

        wallet.sessions.create(this.createIdentityId, mockApp, { maxAge: 1000 * 30 })
            .then((session) => {
                console.log('Session:', session);
                console.log('Serialized Session:', {
                    id: session.getId(),
                    appId: session.getAppId(),
                    identityId: session.getIdentityId(),
                    createAt: session.getCreatedAt(),
                });
            });
    };
}

Sessions.propTypes = {
    wallet: PropTypes.object.isRequired,
};

export default Sessions;