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
                        <span>Get</span>
                        <input
                            type="text"
                            placeholder="sessionId"
                            onChange={ this.handleGetChange } />
                        <button onClick={ this.handleGetSubmit }>Get</button>
                    </div>
                    <div className="option">
                        <span>Is Valid</span>
                        <input
                            type="text"
                            placeholder="sessionId"
                            onChange={ this.handleIsValidChange } />
                        <button onClick={ this.handleIsValidSubmit }>Check</button>
                    </div>
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
                            placeholder="sessionId"
                            onChange={ this.handleDestroyChange } />
                        <button onClick={ this.handleDestroySubmit }>Destroy</button>
                    </div>
                </div>
            </div>
        );
    }

    handleGetChange = (event) => {
        this.getSessionId = event.target.value;
    };

    handleGetSubmit = () => {
        const { wallet } = this.props;

        try {
            const session = wallet.sessions.getById(this.getSessionId);

            console.log(session);
        } catch (err) {
            console.error(err.message);
        }
    };

    handleIsValidChange = (event) => {
        this.isValidSessionId = event.target.value;
    };

    handleIsValidSubmit = () => {
        const { wallet } = this.props;

        console.log(`Session ${this.isValidSessionId} is valid? ${wallet.sessions.isValid(this.isValidSessionId)}`);
    };

    handleCreateChange = (event) => {
        this.createIdentityId = event.target.value;
    };

    handleCreateSubmit = () => {
        const { wallet } = this.props;

        wallet.sessions.create(this.createIdentityId, mockApp, { maxAge: 1000 * 60 * 3 })
        .then((session) => {
            console.log('Session:', session);
            console.log('Serialized Session:', {
                id: session.getId(),
                appId: session.getAppId(),
                identityId: session.getIdentityId(),
                identityDid: session.getIdentityDid(),
                didPublicKeyId: session.getDidPublicKeyId(),
                keyMaterial: session.getKeyMaterial(),
                meta: session.getMeta(),
                createdAt: session.getCreatedAt(),
            });
        })
        .catch(console.error);
    };

    handleDestroyChange = (event) => {
        this.destroySessionId = event.target.value;
    };

    handleDestroySubmit = () => {
        const { wallet } = this.props;

        wallet.sessions.destroy(this.destroySessionId)
        .then(() => console.log(`Session destroyed: ${this.destroySessionId}`));
    };
}

Sessions.propTypes = {
    wallet: PropTypes.object.isRequired,
};

export default Sessions;
