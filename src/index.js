import passPropsThrough from './passPropsThrough';

class RWS {
  static defaultOptions = {
    reconnectDelay: 0,
    reconnectDelayFactor: 1,
    reconnectMaxCount: Infinity,
    shouldReconnect: undefined,
  };

  static ERRORS = {
    EHOSTDOWN: 1,
  };

  static CONNECTING = WebSocket.CONNECTING;
  static OPEN = WebSocket.OPEN;
  static CLOSING = WebSocket.CLOSING;
  static CLOSED = WebSocket.CLOSED;

  static REASSAING_PROPS = ['binaryType', 'onclose', 'onerror', 'onmessage', 'onopen'];
  static PASS_PROPS = [
    'send',
    'binaryType',
    'extensions',
    'onopen',
    'onmessage',
    'onerror',
    'onclose',
    'readyState',
    'protocols',
    'url',
    'bufferedAmount',
  ];

  constructor(url, protocols, options) {
    this.listeners = {
      open: [this.handleWebSocketOpen],
      close: [this.handleWebSocketClose],
    };

    this.CONNECTING = RWS.CONNECTING;
    this.OPEN = RWS.OPEN;
    this.CLOSING = RWS.CLOSING;
    this.CLOSED = RWS.CLOSED;

    this.config = { ...RWS.defaultOptions, ...options };
    this.nextReconnectDelay = this.config.reconnectDelay;
    this.reconnectCount = 0;
    this.previosBufferedAmount = 0;
    this.connect(url, protocols);
  }

  emitError = (code, message) => {
    const error = new Error(message);
    error.code = code;

    const errorListeners = this.listeners.error;
    if (Array.isArray(errorListeners)) {
      errorListeners.forEach(listener => {
        listener(error);
      });
    }

    const errorProp = this.onerror;
    if (typeof errorProp === 'function') {
      errorProp(error);
    }
  };

  connect(url, protocols) {
    const ws = new WebSocket(url, protocols);
    this.switchWebSocket(ws, this.ws);
    this.ws = ws;
  }

  reconnect = () => {
    this.reconnectCount += 1;
    this.nextReconnectDelay = this.nextReconnectDelay * this.config.reconnectDelayFactor;
    this.connect(this.url, this.protocols);
  };

  handleWebSocketOpen = () => {
    this.reconnectCount = 0;
  };

  handleWebSocketClose = (...args) => {
    if (!this.isCloseByClient) {
      let isShouldReconnect = true;
      const { shouldReconnect, reconnectMaxCount } = this.config;
      if (typeof shouldReconnect === 'function') {
        isShouldReconnect = shouldReconnect(...args);
      }

      if (isShouldReconnect) {
        if (this.reconnectCount < reconnectMaxCount) {
          const { nextReconnectDelay } = this;
          if (nextReconnectDelay) {
            this.reconnectTimeout = setTimeout(this.reconnect, nextReconnectDelay);
          } else {
            this.reconnect();
          }
        } else {
          this.emitError(RWS.ERRORS.EHOSTDOWN, 'EHOSTDOWN');
        }
      }
    }
  };

  switchWebSocket(newWs, oldWs) {
    const { listeners } = this;
    Object.keys(listeners).forEach(type => {
      listeners[type].forEach(listener => {
        newWs.addEventListener(type, listener);
      });
    });

    if (oldWs) {
      this.previosBufferedAmount += oldWs.bufferedAmount;

      RWS.REASSAING_PROPS.forEach(key => {
        newWs[key] = oldWs[key]; // eslint-disable-line no-param-reassign
      });
    }

    RWS.PASS_PROPS.forEach(key => {
      passPropsThrough(newWs, this, key);
    });
  }

  close(...args) {
    this.isCloseByClient = true;
    clearTimeout(this.reconnectTimeout);
    this.ws.close(...args);
  }

  addEventListener(type, listener) {
    if (!Array.isArray(this.listeners[type])) {
      this.listeners[type] = [];
    }
    this.listeners[type].push(listener);
    this.ws.addEventListener(type, listener);
  }

  removeEventListener(type, listener) {
    if (Array.isArray(this.listeners[type])) {
      this.listeners[type] = this.listeners[type].filter(
        savedListener => savedListener !== listener,
      );
    }
    this.ws.removeEventListener(type, listener);
  }
}

export default RWS;
