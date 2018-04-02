# <img src='https://user-images.githubusercontent.com/6161300/38206470-31e18e4e-36b3-11e8-9e0d-2a2bd48f06ce.png' height='60' alt='Reconnecting WebSocket' />

[![Build Status](https://travis-ci.org/khromkov/rws.svg?branch=master)](https://travis-ci.org/khromkov/rws)
[![Coverage Status](https://coveralls.io/repos/github/khromkov/rws/badge.svg?branch=master)](https://coveralls.io/github/khromkov/rws?branch=master)

**RWS** - lib for auto reconnect dropped *WebSocket* connection. It has almost same api as *WebSocket*. So you can just replace *WebSocket* to *RWS* in your code for default behavior.

```js
const ws = RWS('ws://url', 'protocols', options);
```

## Options
- reconnectDelay (number) - timeout reconnect after drop. default: 0
- reconnectDelayFactor (number) - increase delay factor for next reconnect, no effect for reconnectDelay === 0. default: 1
- reconnectMaxCount (number) - max reconnect count. default: Infinity.
- shouldReconnect (function(event: CloseEvent): bool) - if it is defined invoke before reconnect with last close args. If return false, reconnection does not occur.
