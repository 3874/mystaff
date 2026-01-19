// adapters/openai.js
// OpenAI Chat Completions
// Docs: https://platform.openai.com/docs/api-reference/chat
import OpenAI from "https://cdn.jsdelivr.net/npm/openai@latest/+esm";
import { historyToString, estimateTokens, checkLanguage } from "../utils.js";

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
  // Use agent-level language if provided (match gemini adapter behavior)
  const language = checkLanguage(agent?.language) || "Korean";
  const MaxToken = agent?.adapter?.token_limit || 128000;
  const LimitToken = MaxToken - 100;

  // Safely coerce processedInput fields to strings so missing values don't throw
  const promptText = String((processedInput && processedInput.prompt) || "");
  const ltmText = String((processedInput && processedInput.ltm) || "");
  const historyText = String(processedInput && processedInput.history ? historyToString(processedInput.history) : "");
  const fileText = String((processedInput && processedInput.file) || "");

  // estimateTokens may return a string; convert to number and fallback to 0
  let PromptLength = Number(String(estimateTokens(promptText)).trim()) || 0;
  let LtmLength = Number(String(estimateTokens(ltmText)).trim()) || 0;
  let HistoryLength = Number(String(estimateTokens(historyText)).trim()) || 0;
  let FileLength = Number(String(estimateTokens(fileText)).trim()) || 0;
  let finalPrompt = "";

  let Prompt1 = promptText.trim() + "\n\n";
  if (agent?.language && agent.language !== "auto") {
    Prompt1 += `Answer concisely and professionally in ${language}.\n`;
  } else {
    Prompt1 += `Answer concisely and professionally in the same language as the user's question.\n`;
  }
  Prompt1 += 'If you do not know the answer, say "I do not know".\n';
  Prompt1 += "Do not make up answers.\n";

  let Prompt2 = "";
  if (ltmText && ltmText.trim()) {
    Prompt2 += "\n\nbased on below ltm:\n";
    Prompt2 += "[ltm]\n";
    Prompt2 += ltmText + "\n";
  }

  let Prompt3 = "";
  if (historyText && historyText.trim()) {
    Prompt3 += "based on below history:\n";
    Prompt3 += "[history]\n";
    Prompt3 += historyText + "\n";
  }

  let Prompt4 = "";
  if (fileText && fileText.trim()) {
    Prompt4 += "\n\nbased on below file:\n";
    Prompt4 += "[file]\n";
    Prompt4 += fileText + "\n";
  }

  if (PromptLength > LimitToken) {
    alert("Prompt가 너무 깁니다. 더 짧게 해주세요.");
    return;
  }

  // 중요도 순서에 따른 프롬프트 재구성 (LTM -> Files -> History -> User Question)
  if (LtmLength + PromptLength > LimitToken) {
    // 필수 정보(질문)만 포함
    finalPrompt = `[USER QUESTION]\n${Prompt1}`;
  } else if (FileLength + LtmLength + PromptLength > LimitToken) {
    // 질문 + LTM 포함
    finalPrompt = `${Prompt2}\n\n[USER QUESTION]\n${Prompt1}`;
  } else if (FileLength + HistoryLength + LtmLength + PromptLength > LimitToken) {
    // 질문 + LTM + 히스토리 포함
    finalPrompt = `${Prompt2}${Prompt3}\n\n[USER QUESTION]\n${Prompt1}`;
  } else {
    // 모든 정보 포함
    finalPrompt = `${Prompt2}${Prompt4}${Prompt3}\n\n[USER QUESTION]\n${Prompt1}`;
  }

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
    temperature: 0.7,
  });

  const content = response.choices[0].message.content;
  console.log(content);
  return content;
}
