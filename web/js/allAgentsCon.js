// allAgentsCon.js
// allAgents.json 접근 함수들


export async function getAllAgents() {
  const endpoint =
    "https://yfef2g1t5g.execute-api.ap-northeast-2.amazonaws.com/default/myAIstaff";

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "getall" }),
    });

    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }

    const raw = await res.json();
    console.log(raw);
    // Lambda Proxy 통합이므로 body가 문자열 JSON일 가능성 있음
    const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw.body;

    return data;
  } catch (err) {
    console.error("getAllAgents failed:", err);
    throw err;
  }
}


export async function getAgentById(staffId) {
  const endpoint =
    "https://yef2g1t5g.execute-api.ap-northeast-2.amazonaws.com/default/myAIstaff";

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "read",
      staff_id: staffId, // Lambda는 staff_id 키를 기대함
    }),
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }

  const raw = await res.json();
  // Lambda 응답 구조가 { statusCode, body } 이므로 body가 문자열이면 파싱
  const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw.body;

  return data;
}


export async function addAgent(agent) {
  // JSON 쓰기 권한이 없으므로 실제 배포환경에서는 서버 API 필요
  console.log("agent:",agent);
}


