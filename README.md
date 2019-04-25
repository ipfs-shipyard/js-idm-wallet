# idm-wallet

[![NPM version][npm-image]][npm-url] [![Downloads][downloads-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Coverage Status][codecov-image]][codecov-url] [![Dependency status][david-dm-image]][david-dm-url] [![Dev Dependency status][david-dm-dev-image]][david-dm-dev-url]

[npm-url]:https://npmjs.org/package/idm-wallet
[downloads-image]:http://img.shields.io/npm/dm/idm-wallet.svg
[npm-image]:http://img.shields.io/npm/v/idm-wallet.svg
[travis-url]:https://travis-ci.org/ipfs-shipyard/js-idm-wallet
[travis-image]:http://img.shields.io/travis/ipfs-shipyard/js-idm-wallet/master.svg
[codecov-url]:https://codecov.io/gh/ipfs-shipyard/js-idm-wallet
[codecov-image]:https://img.shields.io/codecov/c/github/ipfs-shipyard/js-idm-wallet/master.svg
[david-dm-url]:https://david-dm.org/ipfs-shipyard/js-idm-wallet
[david-dm-image]:https://img.shields.io/david/ipfs-shipyard/js-idm-wallet.svg
[david-dm-dev-url]:https://david-dm.org/ipfs-shipyard/js-idm-wallet?type=dev
[david-dm-dev-image]:https://img.shields.io/david/dev/ipfs-shipyard/js-idm-wallet.svg


The reference implementation of the IDM Wallet in JavaScript.


## Installation

```sh
$ npm install idm-wallet
```

This library is written in modern JavaScript and is published in both CommonJS and ES module transpiled variants. If you target older browsers please make sure to transpile accordingly.


## Usage

```js
import createIdmWallet from 'idm-wallet';

await (async () => {
    const idmWallet = createIdmWallet();
})();
```


## API

This library is following closely the [IDM Wallet Specification](https://github.com/ipfs-shipyard/pm-idm/blob/master/docs/idm-spec.md).

We will be providing proper API documentation once the both this library and the specification mature.


## Tests

```sh
$ npm test
$ npm test -- --watch # during development
```


## License

Released under the [MIT License](http://www.opensource.org/licenses/mit-license.php).
