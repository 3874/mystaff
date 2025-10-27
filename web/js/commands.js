import { startDiscussion, filesearch } from "./AI-tools.js";
import { getAllData, updateData } from "./database.js";

export async function handleCommand(input, context, iteration = 10) {
  const [command, ...args] = input.substring(1).split(" ");

  switch (command) {
    case "discuss":
    case "토론":
      const topic_discuss = args.join(" ");
      if (topic_discuss) {
        startDiscussion(topic_discuss, context, iteration);
        return true;
      } else {
        alert(
          "Please provide a topic for the discussion. Usage: /discuss [topic]"
        );
        return true;
      }
    case "filelist":
    case "파일목록": {
      const { sessionId, currentChat, renderMessages } = context;
      const allFiles = await getAllData("myfiles");
      const sessionFiles = allFiles.filter(
        (file) => file.sessionId === sessionId
      );

      let fileListMessage;
      if (sessionFiles.length > 0) {
        const fileNames = sessionFiles
          .map((file) => `<small>${file.fileName}</small>`)
          .join("\n- ");
        fileListMessage = `Files in this session:\n- ${fileNames}`;
      } else {
        fileListMessage = "No files found in this session.";
      }

      const systemMessage = {
        system: fileListMessage,
        date: new Date().toISOString(),
      };

      currentChat.push(systemMessage);
      renderMessages(currentChat);
      await updateData("chat", sessionId, { msg: currentChat });
      return true;
    }
    case "help": {
      const { currentChat, renderMessages } = context;
      
      const helpMessage = `Available Commands:
      
• /discuss [topic] - Start a discussion on a topic

• /filelist - Show all files in current session

• @[fileId] - Reference a file in your message`;

      const systemMessage = {
        system: helpMessage,
        date: new Date().toISOString(),
      };

      currentChat.push(systemMessage);
      renderMessages(currentChat);
      await updateData("chat", sessionId, { msg: currentChat });
      return true;
    }
    default:
      return false;
  }
}
