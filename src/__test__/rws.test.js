// chat-test.js
import WebSocket from '@khromkov/mock-ws';
import RWS from '../index';

const URL = 'ws://localhost:8080';

global.WebSocket = WebSocket;

afterEach(() => {
  WebSocket.mock.clear();
});

describe('reconnecting websocket', () => {
  test('test', () => {
    new RWS(URL); // eslint-disable-line no-new
    expect(WebSocket.mock.instances).toHaveLength(1);
  });

  test('send', () => {
    const rws = new RWS(URL);
    rws.send('message');
    expect(WebSocket.mock.instances).toHaveLength(1);
    expect(WebSocket.mock.instances[0].send.mock.calls).toHaveLength(1);
    expect(WebSocket.mock.instances[0].send.mock.calls[0][0]).toBe('message');
  });

  it('reconnect', () => {
    new RWS(URL); // eslint-disable-line no-new
    WebSocket.mock.instances[0].dispatchEvent('close');

    expect(WebSocket.mock.instances).toHaveLength(2);
    expect(WebSocket.mock.instances[0].url).toBe(WebSocket.mock.instances[1].url);
  });

  it('shouldReconnect', () => {
    const shouldReconnect = (code, reason) => {
      expect(code).toBe(1000);
      expect(reason).toBe('no');
    };
    // eslint-disable-next-line no-unused-vars
    const rws = new RWS(URL, null, { shouldReconnect });
    WebSocket.mock.instances[0].dispatchEvent('close', 1000, 'no');
    expect(WebSocket.mock.instances).toHaveLength(1);
  });

  test('add/remove listeners', () => {
    const rws = new RWS(URL);

    const message = jest.fn();
    const message2 = jest.fn();
    rws.addEventListener('message', message);
    rws.addEventListener('message', message2);

    WebSocket.mock.instances[0].dispatchEvent('message', '');
    expect(message.mock.calls).toHaveLength(1);
    expect(message2.mock.calls).toHaveLength(1);
    rws.removeEventListener('message', message);

    WebSocket.mock.instances[0].dispatchEvent('message', '');
    expect(message.mock.calls).toHaveLength(1);
  });

  test('remove no assign event', () => {
    const rws = new RWS(URL);
    const message = jest.fn();
    rws.removeEventListener('message', message);
  });
});

describe('max retry', () => {
  test('error', () => {
    const rws = new RWS(URL, undefined, {
      maxReconnectCount: 2,
    });

    const onerror = jest.fn();
    rws.onerror = onerror;
    expect(WebSocket.mock.instances[0].onerror).toBe(onerror);
    const errorListener = jest.fn();
    rws.addEventListener('error', errorListener);

    WebSocket.mock.instances[0].dispatchEvent('close');
    WebSocket.mock.instances[1].dispatchEvent('close');
    WebSocket.mock.instances[2].dispatchEvent('close');

    expect(WebSocket.mock.instances).toHaveLength(3);

    expect(errorListener.mock.calls).toHaveLength(1);
    expect(errorListener.mock.calls[0][0].code).toBe(RWS.ERRORS.EHOSTDOWN);
    expect(errorListener.mock.calls[0][0].message).toBe('EHOSTDOWN');

    expect(onerror.mock.calls).toHaveLength(1);
    expect(onerror.mock.calls[0][0].code).toBe(RWS.ERRORS.EHOSTDOWN);
    expect(onerror.mock.calls[0][0].message).toBe('EHOSTDOWN');
  });

  test('max reconnect reset', () => {
    // eslint-disable-next-line no-new
    new RWS(URL, undefined, {
      maxReconnectCount: 1,
    });

    WebSocket.mock.instances[0].dispatchEvent('close');
    WebSocket.mock.instances[1].dispatchEvent('open');
    WebSocket.mock.instances[1].dispatchEvent('close');
    WebSocket.mock.instances[2].dispatchEvent('close');

    expect(WebSocket.mock.instances).toHaveLength(3);
  });
});
