// allAgentsCon.js
// allAgents.json 접근 함수들

export async function getAllAgents() {
  const res = await fetch('../json/allAgents.json');
  return await res.json();
}

export async function getAgentById(staffId) {
  const agents = await getAllAgents();
  return agents.find(a => a.staffId === staffId);
}

export async function addAgent(agent) {
  // JSON 쓰기 권한이 없으므로 실제 배포환경에서는 서버 API 필요
  console.warn("addAgent()는 static 환경에서는 동작하지 않습니다.");
}
