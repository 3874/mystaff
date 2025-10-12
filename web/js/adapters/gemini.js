import { historyToString, estimateTokens, checkLanguage } from "../utils.js";

export async function geminiChatAdapter({ processedInput, agent, sessionId }) {
  const credentials = localStorage.getItem("mystaff_credentials");
  const GEMINI_API_KEY = JSON.parse(credentials || "{}").gemini;
  const model = agent?.model || "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

  if (!GEMINI_API_KEY) {
    alert("Gemini API 키가 없습니다. Credential 페이지에서 설정해주세요.");
    window.location.href = "./credentials.html";
    return;
  }

  const language = checkLanguage(agent?.language);
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
  Prompt1 += `Answer concisely and professionally in ${language}.\n`;
  Prompt1 += `If you do not know the answer, say "I do not know".\n`;
  Prompt1 += `Do not make up answers.\n`;

  let Prompt2 = "";
  // Append ltm block only if ltm is a non-empty string
  if (ltmText && ltmText.trim()) {
    Prompt2 += "\n\nbased on below ltm:\n";
    Prompt2 += "[ltm]\n";
    Prompt2 += ltmText + "\n";
  }

  let Prompt3 = "";
  // Append history block only if history exists and is non-empty
  if (historyText && historyText.trim()) {
    Prompt3 += "based on below history:\n";
    Prompt3 += "[history]\n";
    Prompt3 += historyText + "\n";
  }

  let Prompt4 = "";
  // Append file block only if file is a non-empty string
  if (fileText && fileText.trim()) {
    Prompt4 += "\n\nbased on below file:\n";
    Prompt4 += "[file]\n";
    Prompt4 += fileText + "\n";
  }

  if (PromptLength > LimitToken) {
    alert("Prompt가 너무 깁니다. 더 짧게 해주세요.");
    return;
  } else if (LtmLength + PromptLength > LimitToken) {
    finalPrompt = Prompt1;
  } else if (HistoryLength + LtmLength + PromptLength > LimitToken) {
    finalPrompt = Prompt1 + Prompt2;
  } else if (FileLength + HistoryLength + LtmLength + PromptLength > LimitToken) {
    finalPrompt = Prompt1 + Prompt2 + Prompt3;
  } else {
    finalPrompt = Prompt1 + Prompt2 + Prompt3 + Prompt4;
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          role: "model",
          parts: [
            {
              text:
                agent?.adapter.system_prompt ||
                "You are a concise, professional assistant.",
            },
          ],
        },
        { role: "user", parts: [{ text: finalPrompt }] },
      ],
      generationConfig: {
        temperature: 0.2,
      },
    }),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(
      `Gemini API error: ${res.status} - ${
        errorData.error.message || JSON.stringify(errorData)
      }`
    );
  }
  console.log(res);
  const data = await res.json();
  const content = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!content) throw new Error("Gemini empty content");
  return content;
}
