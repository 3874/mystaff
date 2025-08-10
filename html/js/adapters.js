function assertOk(resp, body) {
  if (!resp.ok) {
    const msg = body?.error?.message || body?.message || resp.statusText;
    throw new Error(`${resp.status} ${msg}`);
  }
}

class OpenAIAdapter {
  constructor(apiKey, model = 'gpt-4o-mini', baseURL = 'https://api.openai.com/v1') {
    this.apiKey = apiKey;
    this.model = model;
    this.baseURL = baseURL.replace(/\/+$/, '');
  }

  async sendMessage(message, opts = {}) {
    const payload = {
      model: opts.model || this.model,
      messages: [{ role: 'user', content: message }],
      temperature: opts.temperature ?? 0.7,
    };

    const resp = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const data = await resp.json().catch(() => ({}));
    assertOk(resp, data);

    return data?.choices?.[0]?.message?.content ?? '';
  }
}

/**
 * Google Gemini Adapter (v1beta generateContent)
 * 모델 예: 'gemini-2.0-flash-exp' / 'gemini-1.5-flash' / 'gemini-1.5-pro'
 */
class GeminiAdapter {
  constructor(apiKey, model = 'gemini-1.5-flash') {
    this.apiKey = apiKey;
    this.model = model;
    this.baseURL = 'https://generativelanguage.googleapis.com/v1beta';
  }

  async sendMessage(message, opts = {}) {
    const model = encodeURIComponent(opts.model || this.model);
    const url = `${this.baseURL}/models/${model}:generateContent?key=${encodeURIComponent(this.apiKey)}`;

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: message }],
        },
      ],
      generationConfig: {
        temperature: opts.temperature ?? 0.7,
      },
    };

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await resp.json().catch(() => ({}));
    assertOk(resp, data);

    // 응답 파싱
    const text =
      data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') ??
      data?.candidates?.[0]?.content?.parts?.[0]?.text ??
      '';
    return text;
  }
}

/**
 * Anthropic Claude Adapter (v1/messages)
 * 모델 예: 'claude-3-5-sonnet-20240620', 'claude-3-5-haiku-20241022'
 */
class ClaudeAdapter {
  constructor(apiKey, model = 'claude-3-5-sonnet-20240620', baseURL = 'https://api.anthropic.com') {
    this.apiKey = apiKey;
    this.model = model;
    this.baseURL = baseURL.replace(/\/+$/, '');
    this.apiVersion = '2023-06-01'; // 안정 버전
  }

  async sendMessage(message, opts = {}) {
    const payload = {
      model: opts.model || this.model,
      max_tokens: opts.max_tokens ?? 1024,
      temperature: opts.temperature ?? 0.7,
      messages: [{ role: 'user', content: message }],
    };

    const resp = await fetch(`${this.baseURL}/v1/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': this.apiVersion,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const data = await resp.json().catch(() => ({}));
    assertOk(resp, data);

    // content 배열 안의 텍스트 파트 결합
    const text = (data?.content || [])
      .map(part => (part?.text ? part.text : ''))
      .join('');
    return text;
  }
}

/**
 * xAI Grok Adapter
 * xAI는 OpenAI 호환 chat.completions을 제공합니다.
 * 모델 예: 'grok-2-latest'
 */
class GrokAdapter {
  constructor(apiKey, model = 'grok-2-latest', baseURL = 'https://api.x.ai/v1') {
    this.apiKey = apiKey;
    this.model = model;
    this.baseURL = baseURL.replace(/\/+$/, '');
  }

  async sendMessage(message, opts = {}) {
    const payload = {
      model: opts.model || this.model,
      messages: [{ role: 'user', content: message }],
      temperature: opts.temperature ?? 0.7,
    };

    const resp = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const data = await resp.json().catch(() => ({}));
    assertOk(resp, data);

    return data?.choices?.[0]?.message?.content ?? '';
  }
}

/**
 * Llama Adapter (Ollama 로컬 실행 가정)
 * Ollama: https://ollama.ai  (기본 포트 11434)
 * 모델 예: 'llama3.1', 'llama3.1:8b-instruct' 등
 */
class LlamaAdapter {
  constructor(baseURL = 'http://localhost:11434', model = 'llama3.1') {
    this.baseURL = baseURL.replace(/\/+$/, '');
    this.model = model;
  }

  async sendMessage(message, opts = {}) {
    const payload = {
      model: opts.model || this.model,
      messages: [{ role: 'user', content: message }],
      stream: false,
      options: {
        temperature: opts.temperature ?? 0.7,
      },
    };

    const resp = await fetch(`${this.baseURL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await resp.json().catch(() => ({}));
    assertOk(resp, data);

    return data?.message?.content ?? data?.messages?.[0]?.content ?? '';
  }
}

/**
 * DeepSeek Adapter (OpenAI 호환 chat.completions)
 * 모델 예: 'deepseek-chat'
 */
class DeepseekAdapter {
  constructor(apiKey, model = 'deepseek-chat', baseURL = 'https://api.deepseek.com') {
    this.apiKey = apiKey;
    this.model = model;
    this.baseURL = baseURL.replace(/\/+$/, '');
  }

  async sendMessage(message, opts = {}) {
    const payload = {
      model: opts.model || this.model,
      messages: [{ role: 'user', content: message }],
      temperature: opts.temperature ?? 0.7,
    };

    const resp = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const data = await resp.json().catch(() => ({}));
    assertOk(resp, data);

    return data?.choices?.[0]?.message?.content ?? '';
  }
}

/**
 * URL Adapter (기존 n8n 등 커스텀 백엔드용)
 */
class URLAdapter {
  constructor(clienturl) {
    this.N8N_WEBHOOK_URL = clienturl;
  }

  async sendMessage(input, sessionId) {
    const requestData = {
      chatInput: input,
      sessionId: sessionId,
    };

    const resp = await fetch(this.N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `mystaff`,
      },
      body: JSON.stringify(requestData),
    });

    const data = await resp.json().catch(() => ({}));
    assertOk(resp, data);

    // n8n 기본 응답 구조 가정
    return Array.isArray(data) ? (data[0]?.output ?? '') : (data?.output ?? '');
  }
}

class MystaffAdapter {
  constructor(apiKey, baseURL) {
    this.apiKey = apiKey;
    this.baseURL = baseURL.replace(/\/+$/, '');
  }

  async sendMessage(message, opts = {}) {
    const payload = {
      model: opts.model || 'default-model',
      messages: [{ role: 'user', content: message }],
      temperature: opts.temperature ?? 0.7,
    };

    const resp = await fetch(`${this.baseURL}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const data = await resp.json().catch(() => ({}));
    assertOk(resp, data);

    return data?.choices?.[0]?.message?.content ?? '';
  }
}

async function handleMessage(chatStaff, sessionId, message, getApiKey) {
    const Staff_func = chatStaff.functionJSON;
    switch (chatStaff.staff_type) {
        case 'default':
        case 'in-house':
            const AIprovider = chatStaff.functionJSON.ai_provider;
            let adapter;
            const apiKeyData = await getApiKey(AIprovider);
            const apiKey = apiKeyData ? apiKeyData.key : null;
            const model = chatStaff.functionJSON.service_model || 'gpt-4o-mini';
            const baseURL = chatStaff.functionJSON.service_url;

            if (!apiKey) {
                const errorMsg = `죄송합니다. ${AIprovider} 서비스의 API 키를 찾을 수 없습니다.`;
                console.error(`API key for ${AIprovider} not found.`);
                return errorMsg;
            }

            switch (AIprovider) {
                case 'openai':
                    adapter = new OpenAIAdapter(apiKey, model, baseURL);
                    break;
                case 'gemini':
                    adapter = new GeminiAdapter(apiKey, model);
                    break;
                case 'claude':
                    adapter = new ClaudeAdapter(apiKey, model, baseURL);
                    break;
                case 'grok':
                    adapter = new GrokAdapter(apiKey, model, baseURL);
                    break;
                case 'llama':
                    adapter = new LlamaAdapter(baseURL, model);
                    break;
                case 'deepseek':
                    adapter = new DeepseekAdapter(apiKey, model, baseURL);
                    break;
                case 'mystaff':
                    adapter = new MystaffAdapter(apiKey, baseURL);
                    break;
                default:
                    const errorMsg = "죄송합니다. 알 수 없는 AI 서비스입니다.";
                    console.error('Unknown AI service:', AIprovider);
                    return errorMsg;
            }

            try {
                const reply = await adapter.sendMessage(message);
                return reply;
            } catch (error) {
                console.error('Error from AI service:', error);
                return error.message || "AI 서비스와 통신 중 오류가 발생했습니다.";
            }
        default:
            const urlAdapter = new URLAdapter(Staff_func.url);
            try {
                const reply = await urlAdapter.sendMessage(message, sessionId);
                return reply;
            } catch (error) {
                console.error('Error from URL service:', error);
                return error.message || "URL 서비스와 통신 중 오류가 발생했습니다.";
            }
    }
}

export {
  OpenAIAdapter,
  GeminiAdapter,
  ClaudeAdapter,
  GrokAdapter,
  LlamaAdapter,
  DeepseekAdapter,
  URLAdapter,
  MystaffAdapter,
  handleMessage,
};