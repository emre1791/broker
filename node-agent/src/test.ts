import { NodeAgent } from './agent';

const agent = new NodeAgent({
  url: 'http://localhost:8080',
  token: '1234',
  room: 'test-room',
});

agent.bind('test', (content) => {
  console.log('Received test message:', content);
});

agent.fire('test', ['STUDIO_CLIENT', 'STUDIO_SERVER'], 'Hello from Node Agent!');

console.log('Node agent is running and listening for messages...');
