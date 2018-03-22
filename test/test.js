// chat-test.js
import { Server } from 'mock-socket';
import RWS from '../src/index';

const URL = 'ws://localhost:8080';

describe('reconnecting websocket', () => {
  it('test', done => {
    const mockServer = new Server(URL);
    const rws = new RWS(URL);

    mockServer.on('connection', () => {
      mockServer.send('test message 1');
      mockServer.send('test message 2');
    });

    const message = jest.fn();
    rws.addEventListener('message', message);

    setTimeout(() => {
      expect(message.mock.calls).toHaveLength(2);

      mockServer.stop(done);
    }, 100);
  });

  test('send', done => {
    const mockServer = new Server(URL);
    const rws = new RWS(URL);
    const message = jest.fn();
    mockServer.on('message', message);

    rws.send('message');

    setTimeout(() => {
      expect(message.mock.calls).toHaveLength(1);

      mockServer.stop(done);
    }, 100);
  });

  it('reconnect', done => {
    let mockServer = new Server(URL);
    const rws = new RWS(URL);

    mockServer.on('connection', () => {
      mockServer.send('test message 1');
    });

    const message = jest.fn();
    const message2 = jest.fn();
    rws.addEventListener('message', message);
    rws.addEventListener('message', message2);
    rws.removeEventListener('message', message2);
    setTimeout(() => {
      mockServer.close();
      mockServer = new Server(URL);

      mockServer.on('connection', () => {
        mockServer.send('test message 1');
      });
    }, 50);

    setTimeout(() => {
      expect(message.mock.calls).toHaveLength(2);
      expect(message2.mock.calls).toHaveLength(0);

      mockServer.stop(done);
    }, 100);
  });

  it('shouldReconnect code', done => {
    const mockServer = new Server(URL);
    const shouldReconnect = jest.fn();
    const rws = new RWS(URL, null, { shouldReconnect });
    setTimeout(() => {
      mockServer.close({ code: 1000, reason: 'test' });
    }, 50);

    setTimeout(() => {
      const event = shouldReconnect.mock.calls[0][0];
      expect(event.code).toBe(1000);
      expect(event.reason).toBe('test');
      done();
    }, 100);
  });

  it('shouldReconnect', done => {
    let mockServer = new Server(URL);
    const rws = new RWS(URL, null, { shouldReconnect: () => false });

    mockServer.on('connection', () => {
      mockServer.send('test message 1');
    });

    const message = jest.fn();
    rws.addEventListener('message', message);
    setTimeout(() => {
      mockServer.close();
      mockServer = new Server(URL);

      mockServer.on('connection', () => {
        mockServer.send('test message 1');
      });
    }, 50);

    setTimeout(() => {
      expect(message.mock.calls).toHaveLength(1);

      mockServer.stop(done);
    }, 100);
  });

  test('add/remove listeners', done => {
    const mockServer = new Server(URL);
    const rws = new RWS(URL);

    const message = jest.fn();
    const message2 = jest.fn();
    expect(() => {
      rws.removeEventListener('message', message);
    }).toThrow();
    rws.addEventListener('message', message);
    rws.addEventListener('message', message2);

    setTimeout(() => {
      mockServer.send('');
      expect(message.mock.calls).toHaveLength(1);
      expect(message2.mock.calls).toHaveLength(1);
      rws.removeEventListener('message', message);
    }, 50);

    setTimeout(() => {
      mockServer.send('');
      expect(message.mock.calls).toHaveLength(1);
      done();
    }, 100);
  });
});
