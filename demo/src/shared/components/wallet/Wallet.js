import React, { Component } from 'react';

import createWallet from '../../../idm-wallet';

import WalletContent from './wallet-content/WalletContent';
import SetupLocker from '../setup-locker/SetupLocker';
import LockScreen from '../lock-screen/LockScreen';

class Wallet extends Component {
    state = {
        wallet: undefined,
    };

    componentDidMount() {
        createWallet().then((wallet) => {
            wallet.locker.onLockedChange(this.handleLockedChanged);

            this.setState({ wallet });
        });
    }

    render() {
        const { wallet } = this.state;

        if (wallet) {
            return this.renderWallet();
        }

        return <div>No Wallet</div>;
    }

    renderWallet = () => {
        const { wallet } = this.state;
        const { locker } = wallet;

        if (locker.isPristine()) {
            return <SetupLocker locker={ locker } onComplete={ this.handleSetupLockerComplete } />
        }

        if (locker.isLocked()) {
            return <LockScreen locker={ locker } />
        }

        return <WalletContent wallet={ wallet } />;
    };

    unlockWallet = (lockType, challenge) => {
        const { wallet: { locker } } = this.state;

        locker.getLock(lockType).unlock(challenge);
    }

    handleLockedChanged = () => {
        this.forceUpdate();
    }

    handleSetupLockerComplete = () => {
        this.forceUpdate();
    };
}

export default Wallet;