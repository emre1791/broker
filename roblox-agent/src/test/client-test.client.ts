import { ClientAgent } from '../client';

const agent = new ClientAgent();

agent.bind('test', (data) => {
  console.log('Received test message data:', data);
});

agent.fire('test', ['NODE'], 'Hello from client!');
