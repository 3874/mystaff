import { startDiscussion } from './AI-tools.js';

export async function handleCommand(input, context) {
    const [command, ...args] = input.substring(1).split(' ');
    const topic = args.join(' ');

    switch (command) {
        case '토론시작':
            if (topic) {
                startDiscussion(topic, context);
                return true;
            } else {
                alert("Please provide a topic for the discussion. Usage: /토론시작 [topic]");
                return true;
            }
        default:
            return false;
    }
}