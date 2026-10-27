// Vercel 서버리스 함수: 브라우저 대신 Claude API를 호출합니다.
// API 키는 환경변수 ANTHROPIC_API_KEY 로만 보관하며 브라우저에는 노출되지 않습니다.

const MODEL = 'claude-sonnet-5-5';
const MAX_MESSAGES = 20;
const MAX_CHARS = 4000;

const EMPLOYEES = {
  dev: {
    system:
      '당신은 가상 AI 오피스에서 일하는 시니어 개발자 "Dev"입니다. ' +
      '사용자의 요청에 한국어로 간결하고 정확하게 답하세요. ' +
      '코드를 쓸 때는 실행 가능한 코드 블록과 짧은 설명을 함께 주고, ' +
      '불확실한 부분은 추측하지 말고 확인이 필요하다고 말하세요.',
  },
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'POST만 지원합니다.' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: '서버에 ANTHROPIC_API_KEY가 설정되지 않았습니다.' });
  }

  const { employee, messages } = req.body || {};
  const persona = EMPLOYEES[employee];
  if (!persona) return res.status(400).json({ error: '알 수 없는 직원입니다.' });

  const valid =
    Array.isArray(messages) &&
    messages.length > 0 &&
    messages.length <= MAX_MESSAGES &&
    messages[messages.length - 1].role === 'user' &&
    messages.every(
      (m) =>
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string' &&
        m.content.length > 0 &&
        m.content.length <= MAX_CHARS,
    );
  if (!valid) return res.status(400).json({ error: '메시지 형식이 올바르지 않습니다.' });

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system: persona.system,
        messages: messages.map(({ role, content }) => ({ role, content })),
      }),
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      console.error('Anthropic API error', upstream.status, data);
      return res.status(502).json({ error: 'AI 응답을 받지 못했습니다. 잠시 후 다시 시도해 주세요.' });
    }

    const reply = (data.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('');
    return res.status(200).json({ reply });
  } catch (err) {
    console.error(err);
    return res.status(502).json({ error: 'AI 서버에 연결하지 못했습니다.' });
  }
};
