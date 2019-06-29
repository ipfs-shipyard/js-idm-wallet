import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Console from '../../../../console/Console';
import IdentityCard from './identity-card/IdentityCard';
import './Identities.css';

class Identities extends Component {
    state = {
        logToConsole: null,
    };

    render() {
        return (
            <>
                <div className="identitiesContainer">
                    { this.renderIdentities() }
                </div>
                <div className="option">
                    <span>List</span>
                    <button onClick={ this.handleList }>List</button>
                </div>
                <div className="option">
                    <span>Create</span>
                    <button onClick={ this.handleCreate }>Create</button>
                </div>
                <div className="option">
                    <span>Peek</span>
                    <input
                        type="text"
                        placeholder="mnemonic"
                        onChange={ this.handlePeekInputChange } />
                    <button onClick={ this.handlePeekSubmit }>Submit</button>
                </div>
                <div className="option">
                    <span>Import</span>
                    <input
                        type="text"
                        placeholder="mnemonic"
                        onChange={ this.handleImportInputChange } />
                    <button onClick={ this.handleImportSubmit }>Submit</button>
                </div>
                <div className="option">
                    <span>Remove</span>
                    <input
                        type="text"
                        placeholder="id"
                        onChange={ this.handleRemoveIdChange } />
                    <input
                        type="text"
                        placeholder="mnemonic"
                        onChange={ this.handleRemoveMnemonicChange } />
                    <button onClick={ this.handleRemoveSubmit }>Remove</button>
                </div>
                <Console logData={ this.state.logToConsole }/>
            </>
        );
    }

    renderIdentities() {
        const { identities } = this.props;

        if (!identities || !identities.length) {
            return <p>No identities yet</p>;
        }

        return identities.map((identity, index) => {
            return (
                <IdentityCard key={ index } profile={ identity.profile.getDetails() } />
            );
        })

        return (
            <>
                <IdentityCard />
                <IdentityCard />
                <IdentityCard />
                <IdentityCard />
                <IdentityCard />
                <IdentityCard />
                <IdentityCard />
                <IdentityCard />
                <IdentityCard />
                <IdentityCard />
                <IdentityCard />
                <IdentityCard />
                <IdentityCard />
                <IdentityCard />
                <IdentityCard />
                <IdentityCard />
                <IdentityCard />
                <IdentityCard />
                <IdentityCard />
                <IdentityCard />
                <IdentityCard />
                <IdentityCard />
                <IdentityCard />
                <IdentityCard />
                <IdentityCard />
                <IdentityCard />
                <IdentityCard />
                <IdentityCard />
                <IdentityCard />
                <IdentityCard />
                <IdentityCard />
            </>
        );
    }

    handleList = () => {
        const { wallet } = this.props;

        try {
            const identities = wallet.identities.list();

            console.log('List Identities:');
            const identitiesString = identities.map((identity) => {
                return {
                    addedAt: identity.getAddedAt(),
                    id: identity.getId(),
                    did: identity.getDid(),
                    devices: identity.devices.list(),
                    backup: identity.backup.getData(),
                    profile: identity.profile.getDetails(),
                };
            });
            this.logToConsole(identitiesString);
            console.log('Final List Identities.');
        } catch (err) {
            this.logToConsole(err);
            console.error(err);
        }
    };

    handleCreate = () => {
        const { wallet } = this.props;

        wallet.identities.create('ipid', {
            profileDetails: {
                '@context': 'https://schema.org',
                '@type': 'Person',
                name: 'John Doe',
            },
            deviceInfo: {
                type: 'laptop',
                name: 'MacBook Pro',
            },
        })
        .then((identity) => {
            console.log('Created Identity:');
            console.log('Identity:', identity);
            const serialized = {
                addedAt: identity.getAddedAt(),
                id: identity.getId(),
                did: identity.getDid(),
                devices: identity.devices.list(),
                backup: identity.backup.getData(),
                profile: identity.profile.getDetails(),
            }
            console.log('Serialized:', serialized);
            console.log(' ');
            console.log('End of Created Identity.');
            this.logToConsole(serialized);
        });
    };

    handleImportInputChange = (event) => {
        this.importValue = event.target.value;
    };

    handleImportSubmit = () => {
        const { wallet } = this.props;

        wallet.identities.import('ipid', {
            mnemonic: this.importValue,
            deviceInfo: {
                type: 'laptop',
                name: 'MacBook Pro',
            },
        })
        .then((result) => {
            console.log('Imported Identity:', result);
            this.logToConsole(result);
        });
    };

    handlePeekInputChange = (event) => {
        this.peekValue = event.target.value;
    };

    handlePeekSubmit = () => {
        const { wallet } = this.props;

        wallet.identities.peek('ipid', {
            mnemonic: this.peekValue,
        })
        .then((result) => {
            console.log('Peek Resolved:', result)
            this.logToConsole(result);
        });
    };

    handleRemoveIdChange = (event) => {
        this.removeIdValue = event.target.value;
    };

    handleRemoveMnemonicChange = (event) => {
        this.removeMnemonicValue = event.target.value;
    };

    handleRemoveSubmit = () => {
        const { wallet } = this.props;

        wallet.identities.remove(this.removeIdValue, {
            mnemonic: this.removeMnemonicValue,
        })
        .then(() => {
            console.log('Removed Successfully!')
            this.logToConsole({ removed: "success"});
        });
    };

    logToConsole(result) {
        this.setState({logToConsole: result});
    }
}

Identities.propTypes = {
    wallet: PropTypes.object.isRequired,
    identities: PropTypes.array,
};

export default Identities;
