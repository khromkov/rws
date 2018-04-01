// chat-test.js
import WebSocket from '@khromkov/mock-ws';
import RWS from '../index';

const URL = 'ws://localhost:8080';

global.WebSocket = WebSocket;

afterEach(() => {
  WebSocket.mock.clear();
});

const getOnTypeEvent = type => `on${type}`;

jest.useFakeTimers();

describe('proxy websocket', () => {
  it('should create WebSocket', () => {
    new RWS(URL, 'protocols'); // eslint-disable-line no-new
    expect(WebSocket.mock.instances).toHaveLength(1);
    expect(WebSocket.mock.instances[0].url).toBe(URL);
    expect(WebSocket.mock.instances[0].protocols).toBe('protocols');
  });

  it('should call WebSocket send', () => {
    const rws = new RWS(URL);
    rws.send('message');
    expect(WebSocket.mock.instances).toHaveLength(1);
    expect(WebSocket.mock.instances[0].send.mock.calls).toHaveLength(1);
    expect(WebSocket.mock.instances[0].send.mock.calls[0][0]).toBe('message');
  });

  it('should call WebSocket close', () => {
    const rws = new RWS(URL);
    rws.close(1000, 'close');
    expect(WebSocket.mock.instances).toHaveLength(1);
    expect(WebSocket.mock.instances[0].close.mock.calls).toHaveLength(1);
    expect(WebSocket.mock.instances[0].close.mock.calls[0][0]).toBe(1000);
    expect(WebSocket.mock.instances[0].close.mock.calls[0][1]).toBe('close');
  });

  it('should have same event handles as WebSocket', () => {
    const rws = new RWS(URL);

    const events = ['open', 'message', 'error', 'close'];
    const handles = {};

    events.forEach(type => {
      const ontype = getOnTypeEvent(type);

      handles[getOnTypeEvent(type)] = jest.fn();
      handles[type] = jest.fn();

      rws[ontype] = handles[ontype];
      rws.addEventListener(type, handles[type]);
    });

    events.forEach(type => {
      WebSocket.mock.instances[0].dispatchEvent(type);
    });

    events.forEach(type => {
      const ontype = getOnTypeEvent(type);

      expect(handles[type]).toHaveBeenCalledTimes(1);
      expect(handles[ontype]).toHaveBeenCalledTimes(1);
    });
  });

  it('should remove listener from WebSocket', () => {
    const rws = new RWS(URL);

    const message = jest.fn();
    rws.addEventListener('message', message);
    rws.removeEventListener('message', message);
    WebSocket.mock.instances[0].dispatchEvent('message', '');
    expect(message.mock.calls).toHaveLength(0);
  });

  it('should no error when remove no assign event', () => {
    const rws = new RWS(URL);
    const message = jest.fn();
    rws.removeEventListener('message', message);
  });
});

describe('reconnect', () => {
  it('should reconnect with same params', () => {
    new RWS(URL, 'protocols'); // eslint-disable-line no-new
    WebSocket.mock.instances[0].dispatchEvent('close');

    expect(WebSocket.mock.instances).toHaveLength(2);
    expect(WebSocket.mock.instances[1].url).toBe(URL);
    expect(WebSocket.mock.instances[1].protocols).toBe('protocols');
  });

  it('should reconnect by rule', () => {
    const shouldReconnect = (code, reason) => {
      expect(code).toBe(1000);
      expect(reason).toBe('no');
    };
    // eslint-disable-next-line no-unused-vars
    const rws = new RWS(URL, null, { shouldReconnect });
    WebSocket.mock.instances[0].dispatchEvent('close', 1000, 'no');
    expect(WebSocket.mock.instances).toHaveLength(1);
  });

  it('should call onerror when max reconnect count was reach', () => {
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

  it('should reset reconnect count', () => {
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

  it('should increase timeout for reconnect', () => {
    // eslint-disable-next-line no-new
    new RWS(URL, undefined, {
      reconnectDelay: 1000,
      reconnectDelayFactor: 2,
    });

    WebSocket.mock.instances[0].dispatchEvent('close');
    jest.runAllTimers();
    expect(setTimeout).toHaveBeenCalledTimes(1);
    expect(setTimeout.mock.calls[0][1]).toBe(1000);

    WebSocket.mock.instances[1].dispatchEvent('close');
    jest.runAllTimers();
    expect(setTimeout).toHaveBeenCalledTimes(2);
    expect(setTimeout.mock.calls[1][1]).toBe(2000);

    expect(WebSocket.mock.instances).toHaveLength(3);
  });

  it('should reassign event handles', () => {
    const rws = new RWS(URL);

    const events = ['open', 'message', 'error', 'close'];
    const handles = {};

    events.forEach(type => {
      const ontype = getOnTypeEvent(type);

      handles[getOnTypeEvent(type)] = jest.fn();
      handles[type] = jest.fn();

      rws[ontype] = handles[ontype];
      rws.addEventListener(type, handles[type]);
    });

    WebSocket.mock.instances[0].dispatchEvent('close');

    events.forEach(type => {
      WebSocket.mock.instances[1].dispatchEvent(type);
    });

    events.forEach(type => {
      const ontype = getOnTypeEvent(type);

      if (type === 'close') {
        expect(handles[type]).toHaveBeenCalledTimes(2);
        expect(handles[ontype]).toHaveBeenCalledTimes(2);
      } else {
        expect(handles[type]).toHaveBeenCalledTimes(1);
        expect(handles[ontype]).toHaveBeenCalledTimes(1);
      }
    });
  });
});
