export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { symbol, name, price, change, sector, type, keyword, keywords } = req.body;
  const API_KEY = process.env.ANTHROPIC_API_KEY;

  try {
    let prompt = '';

    if (type === 'etf_build') {
      prompt = `당신은 전문 주식 포트폴리오 매니저입니다.
사용자가 "${keywords}" 테마의 미니 ETF를 만들고 싶어합니다.

이 테마에 가장 적합한 실제 상장 주식 4~6개를 선정하고, 각 종목의 비중을 설정해주세요.
미국 주식(NASDAQ/NYSE)과 한국 주식(KRX) 모두 포함 가능합니다.
한국 주식의 경우 티커 뒤에 .KS를 붙여주세요 (예: 005930.KS)

반드시 아래 JSON 형식으로만 답변하세요 (다른 텍스트 없이):
{
  "stocks": [
    {"symbol": "티커", "name": "회사명", "pct": 비중숫자, "reason": "선정 이유 한 줄"},
    ...
  ],
  "summary": "이 ETF의 전략을 한 줄로 설명",
  "expectedReturn": "예상 연수익률 숫자만",
  "risk": "낮음 또는 중간 또는 높음"
}
비중의 합은 반드시 100이 되어야 합니다.`;

    } else if (type === 'etf_hint') {
      prompt = `${name}(${symbol})이 "${keyword}" 키워드와 연관된 이유를 한 문장(30자 이내)으로만 답해주세요.`;
    } else {
      prompt = `주식 애널리스트로서 ${name}(${symbol}) 종목을 분석해주세요.
현재가: ${price}, 등락: ${change}%, 섹터: ${sector}
분석 날짜: ${new Date().toLocaleDateString('ko-KR')}

반드시 아래 JSON 형식으로만 답변하세요 (다른 텍스트 없이):
{
  "recommendation": "매수 고려 또는 홀드 또는 매도 고려",
  "score": 0에서 100 사이 숫자,
  "risk": "낮음 또는 중간 또는 높음",
  "summary": "오늘 시장 상황을 반영한 2줄 분석",
  "reasons": ["이유1", "이유2", "이유3"],
  "oneLineTip": "오늘의 핵심 한 줄 조언"
}`;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: type === 'etf_hint' ? 100 : 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    const text = data.content[0].text;

    if (type === 'etf_hint') {
      return res.status(200).json({ hint: text.trim() });
    } else {
      const clean = text.replace(/```json|```/g, '').trim();
      return res.status(200).json(JSON.parse(clean));
    }
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
