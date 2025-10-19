# Moderator Chat Module

## 개요
모든 페이지에서 사용 가능한 moderator 챗봇 기능을 제공하는 모듈입니다.

## 기능
- 모든 페이지에 floating QA 버튼 추가 (우하단)
- 채팅 모달을 통한 moderator와의 대화
- 채팅 히스토리 저장 및 불러오기
- 메시지 복사 기능
- 채팅 히스토리 초기화 기능

## 사용법

### 1. 기본 사용

모듈을 임포트하고 `initModeratorChat()` 함수를 호출합니다:

```javascript
import { initModeratorChat } from '../moderator-chat.js';

$(document).ready(function() {
  // Initialize moderator chat functionality
  initModeratorChat();
  
  // ... 나머지 페이지 로직
});
```

### 2. 프로그래밍 방식으로 채팅 열기

버튼 클릭 등으로 채팅 모달을 열고 싶을 때:

```javascript
import { openModeratorChat } from '../moderator-chat.js';

$("#myButton").on("click", async function() {
  await openModeratorChat();
});
```

## 적용된 페이지

다음 페이지들에 moderator chat이 적용되어 있습니다:

1. `mystaff.js` - My Crew 페이지
2. `myinterns.js` - My Interests 페이지
3. `chatlist.js` - Chat List 페이지
4. `findinterns.js` - Marketplace 페이지
5. `credentials.js` - Credentials 페이지
6. `settings.js` - Settings 페이지
7. `staff-build.js` - Staff Build 페이지
8. `staff-profile.js` - Staff Profile 페이지
9. `staff-manager.js` - Staff Manager 페이지
10. `intern-profile.js` - Intern Profile 페이지
11. `sheet.js` - Sheet 페이지
12. `chat.js` - Chat 페이지
13. `crew-build.js` - Crew Build 페이지
14. `support.html` - Support 페이지 (특별 버튼 연결)

## UI 요소

### Floating QA Button
- 위치: 우하단 (bottom: 20px, right: 20px)
- 크기: 60x60px
- 아이콘: FontAwesome question icon
- z-index: 1000

### Chat Modal
- 크기: modal-lg (Bootstrap large modal)
- 헤더: "Chat" 제목, Reset 버튼, 닫기 버튼
- 바디: 채팅 메시지 영역 (height: 70vh, 스크롤 가능)
- 푸터: 입력 필드와 전송 버튼

## 데이터 저장

채팅 데이터는 IndexedDB의 `chat` store에 저장됩니다:

```javascript
{
  id: "moderator",  // sessionId
  msg: [
    {
      sessionId: "moderator",
      msg: [
        {
          date: "2025-10-19T...",
          speaker: "moderator",
          speakerId: "",
          system: "AI response...",
          user: "User question..."
        }
      ],
      title: "moderator chat",
      staffId: "moderator"
    }
  ]
}
```

## 의존성

필수 모듈:
- `database.js` - IndexedDB 작업용
- `adapters/moderator.js` - AI 응답 생성용
- `marked` - 마크다운 렌더링용

필수 라이브러리:
- jQuery 3.7.1
- Bootstrap 5.3.2
- Font Awesome 6.5.0

## API

### initModeratorChat()
moderator chat 기능을 초기화합니다. 페이지에 floating button과 modal을 추가하고 이벤트 핸들러를 설정합니다.

```javascript
import { initModeratorChat } from '../moderator-chat.js';
initModeratorChat();
```

### openModeratorChat()
프로그래밍 방식으로 chat modal을 엽니다. 기존 채팅 히스토리를 로드합니다.

```javascript
import { openModeratorChat } from '../moderator-chat.js';
await openModeratorChat();
```

## 커스터마이징

### 스타일 변경
Floating button 스타일을 변경하려면 `moderator-chat.js`의 `qaBotButton` 변수를 수정하세요:

```javascript
const qaBotButton = `
  <button id="qa-bot-fab" class="btn btn-primary rounded-circle shadow" 
    style="position: fixed; bottom: 20px; right: 20px; 
           width: 60px; height: 60px; font-size: 24px; 
           z-index: 1000; display: flex; align-items: center; 
           justify-content: center;">
    <i class="fas fa-question"></i>
  </button>
`;
```

### 메시지 렌더링 커스터마이징
`renderMessages()` 함수를 수정하여 메시지 표시 방식을 변경할 수 있습니다.

## 문제 해결

### Chat modal이 표시되지 않음
- Bootstrap이 제대로 로드되었는지 확인
- `initModeratorChat()`가 DOM이 준비된 후 호출되었는지 확인

### 메시지가 저장되지 않음
- IndexedDB가 브라우저에서 활성화되어 있는지 확인
- `database.js`가 제대로 임포트되었는지 확인

### AI 응답이 없음
- `adapters/moderator.js`가 제대로 설정되었는지 확인
- API credentials가 설정되어 있는지 확인
