import passPropsThrough from './passPropsThrough';

const REASSAING_PROPS = ['binaryType', 'onclose', 'onerror', 'onmessage', 'onopen'];
const PASS_PROPS_THROUGH_EXCLUDE = [
  'addEventListener',
  'removeEventListener',
  'send',
  'close',
  'listeners',
];

class ReconnectingWebSocket {
  static defaultOptions = {
    reconnectingDelay: 1000,
    reconnectingDelayFactor: 1,
    maxReconnectCount: Infinity,
  };

  static ERRORS = {
    EHOSTDOWN: 1,
  };

  constructor(url, protocols, options) {
    this.url = url;
    this.protocols = protocols;
    this.options = options;
    this.listeners = {
      open: [this.handleWebSocketOpen],
      close: [this.handleWebSocketClose],
    };

    this.config = { ...ReconnectingWebSocket.defaultOptions, ...options };
    this.reconnectCount = 0;
    this.connect();
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

  handleWebSocketOpen = () => {
    this.reconnectCount = 0;
  };

  handleWebSocketClose = (...args) => {
    let isShouldReconnect = true;
    const { shouldReconnect, maxReconnectCount } = this.config;
    if (typeof shouldReconnect === 'function') {
      isShouldReconnect = shouldReconnect(...args);
    }

    if (isShouldReconnect) {
      if (this.reconnectCount < maxReconnectCount) {
        this.reconnectCount += 1;
        this.connect();
      } else {
        this.emitError(ReconnectingWebSocket.ERRORS.EHOSTDOWN, 'EHOSTDOWN');
      }
    }
  };

  switchWebSocket(newWs, oldWs) {
    this.send = newWs.send.bind(newWs);
    const { listeners } = this;
    Object.keys(listeners).forEach(type => {
      listeners[type].forEach(listener => {
        newWs.addEventListener(type, listener);
      });
    });

    if (oldWs) {
      REASSAING_PROPS.forEach(key => {
        newWs[key] = oldWs[key]; // eslint-disable-line no-param-reassign
      });
    }

    Object.keys(newWs).forEach(key => {
      if (!PASS_PROPS_THROUGH_EXCLUDE.includes(key)) {
        passPropsThrough(newWs, this, key);
      }
    });
  }

  connect() {
    const ws = new WebSocket(this.url, this.protocols);
    this.switchWebSocket(ws, this.ws);
    this.ws = ws;
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

export default ReconnectingWebSocket;
