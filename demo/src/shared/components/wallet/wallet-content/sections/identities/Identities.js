import React, { Component } from 'react';
import PropTypes from 'prop-types';
import IdentityCard from './identity-card/IdentityCard';
import Console from '../../../../console/Console';
import GenericCard from '../../../../generic-card/GenericCard';
import './Identities.css';

class Identities extends Component {
    state = {
        logArray: [],
        logIndex: -1,
    };

    render() {
        const { logArray, logIndex } = this.state;
        console.log('logArray', logArray);
        console.log('logIndex', logIndex);
        return (
            <>
                <div className="identitiesContainer">
                    { this.renderIdentities() }
                </div>
                <div className="operations">
                    { this.renderOperations() }
                </div>
                <Console
                    logData={ logArray[logIndex] }
                    forward={ this.handleForwardOutput }
                    backward={ this.handleBackwardOutput }
                />
            </>
        );
    }

    renderOperations() {
        return (
            <>
                <GenericCard className="operation">
                    <h4>Create</h4>
                    <div><button onClick={ this.handleCreate }>Create</button></div>
                </GenericCard>
                <GenericCard className="operation">
                    <h4>Peek</h4>
                    <div>
                        <input
                        type="text"
                        placeholder="mnemonic"
                        onChange={ this.handlePeekInputChange } />
                        <button onClick={ this.handlePeekSubmit }>Submit</button>
                    </div>
                </GenericCard>
                <GenericCard className="operation">
                    <h4>Import</h4>
                    <div>
                    <input
                        type="text"
                        placeholder="mnemonic"
                        onChange={ this.handleImportInputChange } />
                    <button onClick={ this.handleImportSubmit }>Submit</button>
                    </div>
                </GenericCard>
                <GenericCard className="operation">
                    <h4>Remove</h4>
                    <div>
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
                </GenericCard>
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

    handleForwardOutput = () => {
        const { logArray, logIndex} = this.state;

        if(logIndex >= logArray.length - 1) {
            return;
        } else {
            console.log("Avanço");
            this.setState({logIndex: logIndex + 1});
        }
    }

    handleBackwardOutput = () => {
        const { logArray, logIndex} = this.state;

        if(logIndex <= 0) {
            return;
        } else {
            console.log("Retrocesso");
            this.setState({logIndex: logIndex - 1});
        }
    }

    logToConsole(result) {
        const { logArray, logIndex} = this.state;

        const newLogArray = [...logArray, result]
        this.setState({
            logArray: newLogArray,
            logIndex: logArray.length,
        });
    }
}

Identities.propTypes = {
    wallet: PropTypes.object.isRequired,
    identities: PropTypes.array,
};

export default Identities;
