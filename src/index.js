import passPropsThrough from './passPropsThrough';

const REASSAING_PROPS = ['binaryType', 'onclose', 'onerror', 'onmessage', 'onopen'];
const PASS_PROPS_THROUGH_EXCLUDE = ['addEventListener', 'removeEventListener', 'send', 'close'];

class ReconnectingWebSocket {
  static defaultOptions = {
    reconnectingDelay: 1000,
    reconnectingDelayFactor: 1,
    maxReconnectCount: Infinity,
  };

  constructor(url, protocols, options) {
    this.url = url;
    this.protocols = protocols;
    this.options = options;
    this.listeners = {};

    this.config = { ...ReconnectingWebSocket.defaultOptions, ...options };
    this.reconnectCount = 0;
    this.connect();
  }

  handleWebSocketOpen = () => {
    this.reconnectCount = 0;
  };

  handleWebSocketClose = event => {
    let isShouldReconnect = true;
    const { shouldReconnect, maxReconnectCount } = this.config;
    if (typeof shouldReconnect === 'function') {
      isShouldReconnect = shouldReconnect(event);
    }

    if (isShouldReconnect && this.reconnectCount < maxReconnectCount) {
      this.reconnectCount += 1;
      this.connect();
    }
  };

  switchWebSocket(newWs, oldWs) {
    this.send = newWs.send.bind(newWs);

    newWs.addEventListener('open', this.handleWebSocketOpen);
    newWs.addEventListener('close', this.handleWebSocketClose);

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
