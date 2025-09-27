import { historyToString } from "../utils.js";

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
