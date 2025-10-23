function assertOk(resp, data) {
  if (!resp.ok) {
    throw new Error(
      `HTTP error! status: ${resp.status}, data: ${JSON.stringify(data)}`
    );
  }
}
// moderator adapter
export async function moderatorAdapter({ prompt, language, history, ltm}) {

  const host = "https://ai.yleminvest.com/webhook/aicrew/moderator";

  const payload = {
    sessionId: "moderator-session",
    prompt: prompt,
    language: language,
    history: history,
    ltm: ltm
  };

  const resp = await fetch(host, {
    method: "POST",
    headers: { "Authorization":"mystaff", "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await resp.json().catch(() => ({}));

  assertOk(resp, data);
  return data[0]?.output || "No response from server";

}
