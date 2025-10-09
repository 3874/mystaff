// adapters/openai.js
// OpenAI Chat Completions
// Docs: https://platform.openai.com/docs/api-reference/chat
import OpenAI from "https://cdn.jsdelivr.net/npm/openai@latest/+esm";
import { historyToString } from "../utils.js";

//import OpenAI from 'https://esm.sh/openai@4.57.0';

export async function openAIChatAdapter({ processedInput, agent, sessionId }) {
  const credentials = localStorage.getItem("mystaff_credentials");
  const OPENAI_API_KEY = JSON.parse(credentials || "{}").openai;

  const apiKey = OPENAI_API_KEY;
  const llm_model = agent?.adapter.model || "gpt-4o-mini";
  const url =
    agent?.adapter.host || "https://api.openai.com/v1/chat/completions";
  const client = new OpenAI({ apiKey: apiKey, dangerouslyAllowBrowser: true });

  if (!apiKey) {
    alert("OpenAI API 키가 없습니다. Credential 페이지에서 설정해주세요.");
    window.location.href = "./credentials.html";
    return;
  }
  console.log(processedInput.history);
  let finalPrompt = processedInput.prompt.trim() + "\n\n";
  finalPrompt += "Answer concisely and professionally in Korean.\n";
  finalPrompt += 'If you do not know the answer, say "I do not know".\n';
  finalPrompt += "Do not make up answers.\n";
  finalPrompt += "based on below history:\n";
  finalPrompt += "[history]\n";
  finalPrompt += historyToString(processedInput.history) + "\n";
  finalPrompt += "\n\nbased on below ltm:\n";
  finalPrompt += "[ltm]\n";
  finalPrompt += processedInput.ltm + "\n";

  const response = await client.chat.completions.create({
    model: llm_model,
    messages: [
      {
        role: "system",
        content:
          agent?.adapter.system_prompt ||
          "You are a concise, professional assistant.",
      },
      { role: "user", content: finalPrompt },
    ],
    //tools: [{type:"web_search"}],
    temperature: 0.2,
  });

  const content = response.choices[0].message.content;
  console.log(content);
  return content;
}
