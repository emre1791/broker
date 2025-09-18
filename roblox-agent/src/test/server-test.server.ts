import { ServerAgent } from '../server';

const agent = new ServerAgent({
  url: 'http://localhost:8080',
  room: 'test-room',
  token: {
    type: 'RAW',
    value: '1234',
  },
});

agent.bind('test', (data) => {
  console.log('Received test message data:', data);
});

agent.fire('test', ['NODE'], 'Hello from server!');
