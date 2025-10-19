// moderator adapter
export async function moderatorAdapter({ prompt, language, history, ltm}) {
  const url =
    "https://1nzyp04c0l.execute-api.ap-northeast-2.amazonaws.com/default/ask";

  const payload = {
    prompt: prompt,
    language: language,
    history: history,
    ltm: ltm,
  };

  console.log("Moderator Adapter Payload:", payload);

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  console.log(
    "Moderator Adapter Response Status:",
    resp.status,
    resp.statusText
  );

  let data;
  try {
    data = await resp.json();

    if (typeof data.body === "string") {
      data = JSON.parse(data.body);
    }
  } catch (err) {
    console.error("Failed to parse JSON:", err);
    data = {};
  }

  if (!resp.ok) {
    console.error("Server error:", data);
    throw new Error(`HTTP ${resp.status}: ${data.message || "Server Error"}`);
  }

  console.log("Moderator Adapter Response Data:", data);
  return data.output || "No response from server";
}
