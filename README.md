# mystaff
My AI staff


# mystaff 만들기

mystaff을 만드는 방법은 크게 두가지가 있다. 하나는 기성 LLM을 사용하는 방법과 자체 서버로 구현하는 방법이다.

1. 기성 LLM을 사용하는 방법은 현재 openai와 gemini가 가능하고 그 형식은 다음과 같다.
staff의 이름과 role 그리고 간단한 요약을 summary에 정리해 넣으면 된다. 가장 중요한 부분은 adapter안에 있는 system_prmopt로 여기에 어떻게 넣느냐에 따라 이 staff의 역할과 성격이 달라진다.

*현재는 두 LLM의 텍스트 모델만 사용 가능하며 향후에는 다른 모델들도 지원 예정으로 지금은 input_format과 output_format은 아래와 같이 넣으면 되지만 이후에는 이 부분을 상세히 넣어야 한다. 

gemini or openai
{
    "staff_name": "",
    "role": "",
    "summary": "",
    "resource" : "chat",  // chat, database, image, movie clip, coding등으로 나뉨
    "adapter": {
        "model": "gemini-2.5-flash",
        "name": "gemini",
        "system_prompt": "",
        "token_limit": 
    },
}

2. 자체 서버로 구현하는 방법

{
    "role": "",
    "staff_name": "",
    "summary": "",
    "resource": "chat", // chat, database, image, movie clip, coding등으로 나뉨
    "adapter": {
        "name": "http",
        "apiUrl": "",
        "method": "",
        "token_limit": 
        "headers": {
            "Authorization": '',
            "Content-Type": "application/json"
        },
    },
}



  const prompt = {
    prompt: modifiedInput,
    history: convertHistoryToText(last20), // string
    ltm: ltmText, // string
    file: allFilesText || "", // string
    token_limit: agent?.adapter?.token_limit || 128000, // number (safe optional chaining)
  };



mystaff -> 서버 (Input)

{
	method: 'POST',   //GET, POST, PUT, DELETE이 모두 가능
	headers:  { "Content-Type": "application/json" }, //보안 연결이 필요한 경우는 JWT 토큰 방식으로 인증
	body: JSON.stringify(payload)
}

payload = {
    action: 'read
}



서버 -> mystaff (Response)


{
	method: 'POST',
	headers:  { "Content-Type": "application/json" },
	body: JSON.stringify({
		action: 'read',
		staffId: '
	})
}


JWT 토큰 받는 방식: 기본 api URL + /api/signin로 ID, PASSWORD 인증을 통해 토큰 제공

{
	method: 'POST',
	headers:  { "Content-Type": "application/json" },
	body: JSON.stringify({
		input: processedInput,
		sessionId: ''
	})
}

processedInput = {
    prompt: modifiedInput,
    history: last20,
    ltm: ltm.contents || "",
    file:
      allFilesInfo.join("\n\n---------------------------------------\n\n") ||
      "",
    token_limit: agent.adapter.token_limit || 128000,
}