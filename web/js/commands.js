import { startDiscussion, filesearch } from './AI-tools.js';

export async function handleCommand(input, context, iteration = 10) {
    const [command, ...args] = input.substring(1).split(' ');

    switch (command) {
        case 'discuss':
        case '토론':
            const topic_discuss = args.join(' ');
            if (topic_discuss) {
                startDiscussion(topic_discuss, context, iteration);
                return true;
            } else {
                alert("Please provide a topic for the discussion. Usage: /discuss [topic]");
                return true;
            }
        case 'filesearch':
        case '파일검색':
            if (args.length >= 2) {
                const fileId = args[0];
                const topic_filesearch = args.slice(1).join(' ');
                filesearch(topic_filesearch, fileId, context);
                return true;
            } else {
                alert("Usage: /filesearch [fileId] [topic]");
                return true;
            }
        default:
            return false;
    }
}
