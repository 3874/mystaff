import { getAdapter } from "./adapters/index.js";

export async function handleMsg(processedInput, agent, sessionId) {

  try {
    const adapter = getAdapter(agent?.adapter?.name || "moderator");
    const output = await adapter({processedInput, agent, sessionId});

    return typeof output === "string" ? output : JSON.stringify(output);
  } catch (err) {
    console.error("Adapter error:", err);
    return "지금은 답변을 생성할 수 없습니다. 잠시 후 다시 시도해 주세요.";
  }
}
