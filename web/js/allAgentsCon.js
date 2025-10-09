// allAgentsCon.js
// allAgents.json 접근 함수들
const myAIstaffUrl = "https://r2jt9u3d5g.execute-api.ap-northeast-2.amazonaws.com/default/mystaff";


export async function getAllAgents() {
  const endpoint = myAIstaffUrl;

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
    // Lambda Proxy 통합이므로 body가 문자열 JSON일 가능성 있음
    const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw.body;

    return data;
  } catch (err) {
    console.error("getAllAgents failed:", err);
    throw err;
  }
}

export async function getAllAgentsWithStatus() {
  const endpoint = myAIstaffUrl;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "getallwithapproved" }),
    });

    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }

    const raw = await res.json();
    // Lambda Proxy 통합이므로 body가 문자열 JSON일 가능성 있음
    const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw.body;

    return data;
  } catch (err) {
    console.error("getAllAgents failed:", err);
    throw err;
  }
}

export async function getAgentById(staffId) {
  const endpoint = myAIstaffUrl;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "read",
      staff_id: staffId,
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


export async function addAgent(addData) {
  const endpoint = myAIstaffUrl;
  console.log("addAgent called with data:", addData);
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        ...addData,
      }),
    });

    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }

    const raw = await res.json();
    const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw.body;

    return data;
  } catch (err) {
    console.error("addAgent failed:", err); // 함수명과 로그 메시지 통일
    throw err;
  }
}

export async function updateAgentById(staffId, updateData) {
  const endpoint = myAIstaffUrl;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update",
        staff_id: staffId,
        ...updateData,
      }),
    });

    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }

    const raw = await res.json();
    const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw.body;

    return data;
  } catch (err) {
    console.error("updateAgentById failed:", err);
    throw err;
  }
}

export async function deleteAgentById(staffId) {
  const endpoint = myAIstaffUrl;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "delete",
        staff_id: staffId,
      }),
    });

    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }

    const raw = await res.json();
    const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw.body;

    return data;
  } catch (err) {
    console.error("deleteAgentById failed:", err);
    throw err;
  }
}
