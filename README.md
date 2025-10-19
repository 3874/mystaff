# My AI crew
AIcrew.info


# My AI crew 만들기

My AI crew을 만드는 방법은 크게 두가지가 있다. 하나는 기성 LLM을 사용하는 방법과 자체 서버로 구현하는 방법이다.

1. 기성 LLM을 사용하는 경우의 staff의 형식

지금은 현재 openai와 gemini가 가능하고 그 형식은 다음과 같다.
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

2. 자체 서버로 구현하는 경우의 staff 형식

아래 부분의 모든 값을 넣어줘야 작동한다. 

{
    "role": "",
    "staff_name": "",
    "summary": "",
    "language": "",
    "resource": "chat", // chat, database, image, coding등으로 나뉨
    "adapter": {
        "name": "http",
        "host": "",
        "method": "",
        "token_limit": 
        "headers": {
            "Authorization": '',
            "Content-Type": "application/json"
        },
    },
}


# 서버 구성
서버로는 다음과 같은 형태로 fetch한다.

{
	method: 'POST',   //GET, POST, PUT, DELETE이 모두 가능
	headers:  { "Content-Type": "application/json" }, //보안 연결이 필요한 경우는 JWT 토큰 방식으로 인증하며 아래에 추가로 설명하겠다.
	body: JSON.stringify(payload)
}


단, payload의 구성은 다음과 같이 경우에 따라 달라진다.

1. staff의 resource가 chat인 경우

payload = {
    action: 'chat',
    prompt: '',
    history: '',        // 최근 대화 20개까지 string으로 만들어서 보냄
    ltm: '',            // My AI crew에서 만든 long term memory를 string으로 만들어서 보냄
    file: '',           // 참조하고자하는 파일이 로컬에 저장되어 있는 경우 string으로 만들어서 보냄
    language: '',       // staff의 기본 언어
    sessionId: '',      // 대화의 session id
    token_limit: '',    //staff의 토큰 제한
}

[파일업로드하는 경우]
formData형태로 전송하는데 body에 다음을 포함.

payload = {
    action: 'upload',
    file: '',
    sessionId: '',       
    fileName: '',            
}


2. staff의 resource가 database 인 경우 (ag-Grid 사용중)

{
  "action": "query",        // read, create, update, delete, query, upload
  "start": 0,               // 페이지의 스타트
  "length": 50,             // 한페이지에서 데이터의 길이    
  "search": "검색어",        // 검색어
  "orderColumn": {          // 정렬할 컬럼
    "columnId": "name",
    "sort": "asc"           // asc, desc
  },
  "orderDir": "asc"         // 정렬 방향
}



서버 -> My AI crew (Response)

1. 기본형
{
    meta: {},
    output: {}
}




보안 방식: JWT 토큰 - 기본 api URL + /api/signin로 ID, PASSWORD 인증을 통해 토큰 제공
