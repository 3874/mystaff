import { RemoteRunnable } from "https://cdn.jsdelivr.net/npm/langchain@0.2.5/dist/runnables/remote.js";

// adapters/mystaff.js
// MyStaff 전용 LangServe 엔드포인트와 통신하는 LangChain 어댑터입니다.
export async function langchainAdapter({ prompt, agent, sessionId }) {
  const url = agent.service_url;

  if (!url) {
    throw new Error("MyStaff adapter requires a service_url in the agent configuration.");
  }

  const remoteChain = new RemoteRunnable({
    url: url,
  });

  try {
    // LangServe는 보통 { input: "..." } 형태의 입력을 기대합니다.
    // sessionId는 configurable 필드를 통해 전달합니다.
    const response = await remoteChain.invoke(
      { input: prompt },
      { configurable: { sessionId: sessionId } }
    );

    // 원격 체인의 출력 형식에 따라 응답을 처리합니다.
    if (typeof response === 'string') {
      return response;
    }
    if (response && typeof response.content === 'string') {
      return response.content;
    }
    // 그 외의 경우, 객체를 문자열로 변환하여 반환합니다.
    return JSON.stringify(response);

  } catch (e) {
    console.error("Error invoking LangChain RemoteRunnable for MyStaff:", e);
    throw new Error(`MyStaff LangChain adapter error: ${e.message}`);
  }
}

