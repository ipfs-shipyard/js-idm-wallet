import React, { Component } from 'react';

import Wallet from './shared/components/wallet/Wallet';

import './App.css';

class App extends Component {
  render() {
    return (
      <div className="App">
        <Wallet />
      </div>
    );
  }
}

export default App;
