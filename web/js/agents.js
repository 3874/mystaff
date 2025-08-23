import { getAdapter } from './adapters/index.js';

// ---- 메인 핸들러 ----
export async function handleMsg(processedInput, agent, sessionId) {
  const input = processedInput?.input ?? "";
  const history = processedInput?.context ?? [];
  const ltm = processedInput?.ltm ?? "";
  const token_limit = processedInput?.token_limit ?? (agent?.token_limit ?? 8192);

  // 안전 직렬화
  const historyArr = Array.isArray(history) ? history : [history];
  const historyJson = JSON.stringify(historyArr.slice(-10), null, 2);

  const ltmJson = JSON.stringify(ltm, null, 2);

  // 모델별 토크나이저
  const encode = await loadTokenizerForAgent(agent);

  // 프롬프트 생성 + 토큰 예산 체크
  const finalPrompt = await generatePrompt({ input, historyJson, ltmJson, token_limit, encode });

  if (finalPrompt === "##tooLong##") {
    alert('Too long input data');
    return;
  }

  try {
    const adapter = getAdapter(agent?.adapter || 'openai');
    const output = await adapter({ prompt: finalPrompt, agent, sessionId }); 
    return typeof output === 'string' ? output : JSON.stringify(output);
  } catch (err) {
    console.error('Adapter error:', err);
    return '지금은 답변을 생성할 수 없습니다. 잠시 후 다시 시도해 주세요.';
  }
}

// ---- 프롬프트/토큰 로직 ----
async function generatePrompt({ input, historyJson, ltm, token_limit, encode }) {
  // 출력 예산: 전체의 25% 또는 최소 1024토큰 중 큰 값 택일 (모델 상황에 맞게 조정 가능)
  const OUTPUT_BUDGET = Math.max(2048, Math.floor(token_limit * 0.25));
  const HARD_OVERHEAD = 64; // role/구분자 등 여유

  const mkP1 = () => `
    ${input}, based on

    --- CHAT HISTORY ---
    ${historyJson}
    --- END CHAT HISTORY ---

    --- CURRENT LTM ---
    ${ltm} 
    --- END CURRENT LTM ---

    Be precise and helpful.`.trim();

  const mkP2 = () => `
    ${input}, based on

    --- CURRENT LTM ---
    ${ltm} 
    --- END CURRENT LTM ---

    Be precise and helpful.`.trim();

  const mkP3 = () => `${input}`.trim();

  // 토큰 카운트 함수
  const count = (text) => encode(String(text)).length;

  // 사용 가능한 입력 예산(= 전체 - 출력예산 - 오버헤드)
  const INPUT_BUDGET = Math.max(0, token_limit - OUTPUT_BUDGET - HARD_OVERHEAD);

  let p1 = mkP1();
  let t1 = count(p1);

  if (t1 <= INPUT_BUDGET) return p1;

  // p1이 길면 history를 점진적으로 더 줄여보자
  let history = JSON.parse(historyJson);
  if (!Array.isArray(history)) history = [history];
  let slice = 8;
  while (slice >= 1) {
    const h = JSON.stringify(history.slice(-slice), null, 2);
    p1 = mkP1().replace(historyJson, h);
    t1 = count(p1);
    if (t1 <= INPUT_BUDGET) return p1;
    slice = Math.floor(slice / 2);
  }

  // p2 시도(LTM만 유지)
  const p2 = mkP2();
  const t2 = count(p2);
  if (t2 <= INPUT_BUDGET) return p2;

  // p3(사용자 입력만)
  const p3 = mkP3();
  const t3 = count(p3);
  if (t3 <= INPUT_BUDGET) return p3;

  // 모두 실패
  return "##tooLong##";
}

// ---- 토크나이저 로더 ----
async function loadTokenizerForAgent(agent) {
  const model = (agent?.model || 'gpt-4o').toLowerCase();

  // 모델→인코딩 매핑
  // - gpt-4o, gpt-4.1, o1/o3/o4 계열: o200k_base
  // - gpt-4*, gpt-3.5*: cl100k_base
  const encoding =
    /(^gpt-4o\b)|(^gpt-4\.1\b)|(^o[134]\b)/.test(model) ? 'o200k_base' :
    /(^gpt-4\b)|(^gpt-3\.5\b)/.test(model) ? 'cl100k_base' :
    'o200k_base';

  // UMD 스크립트 주입(브라우저)
  const globalName = `GPTTokenizer_${encoding}`;
  if (!window[globalName]) {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = `https://unpkg.com/gpt-tokenizer/dist/${encoding}.js`;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  const ns = window[globalName];
  if (!ns || typeof ns.encode !== 'function') {
    throw new Error(`Tokenizer load failed for ${encoding}`);
  }
  return ns.encode; // (text:string)=>number[]
}