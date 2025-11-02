import { startDiscussion, filesearch, fileupload } from "./AI-tools.js";
import { getAllData, updateData } from "./database.js";

export async function handleCommand(input, context, iteration = 10) {
  const [command, ...args] = input.substring(1).split(" ");

  switch (command) {
    case "discuss":
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
    case "fupload": {
        const query = args.join(" ");

        if (query) {
          // Extract fileId if provided (format: /fsearch @fileId query)
          const fileIdMatch = query.match(/@(\w+)/);
          const fileId = fileIdMatch ? fileIdMatch[1] : null;

          if (!fileId) {
            alert(
              "Please provide a file ID. Usage: /fupload @[fileId]"
            );
            return true;
          }

          const response = await fileupload(fileId);
          return true;
        } else {
          alert(
            "Please provide a search query. Usage: /fupload @[fileId]"
          );
          return true;
        }
      }
    case "fsearch": {
      const query = args.join(" ");

      if (query) {
        // Extract fileId if provided (format: /fsearch @fileId query)
        const fileIdMatch = query.match(/@(\w+)/);
        const fileId = fileIdMatch ? fileIdMatch[1] : null;
        const searchQuery = fileId ? query.replace(/@\w+\s*/, "").trim() : query;

        if (!fileId) {
          alert(
            "Please provide a file ID. Usage: /fsearch @[fileId] [query]"
          );
          return true;
        }

        filesearch(searchQuery, fileId, context);
        return true;
      } else {
        alert(
          "Please provide a search query. Usage: /fsearch @[fileId] [query]"
        );
        return true;
      }
    }
    case "flist": {
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

• /fsearch @[fileId] [query] - Search within a specific file

• /flist - Show all files in current session

• /fupload - Upload a new file

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
