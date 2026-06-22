export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { symbol, name, price, change, sector, type, keyword } = req.body;
  const API_KEY = process.env.ANTHROPIC_API_KEY;
  try {
    let prompt = type === 'etf_hint'
      ? `${name}(${symbol})이 "${keyword}" 키워드와 연관된 이유를 한 문장(30자 이내)으로만 답해주세요.`
      : `주식 애널리스트로서 ${name}(${symbol}) 분석. 현재가:${price}, 등락:${change}%, 섹터:${sector}. JSON만 반환(다른텍스트없이): {"recommendation":"매수 고려 또는 홀드 또는 매도 고려","score":숫자,"risk":"낮음 또는 중간 또는 높음","summary":"2줄분석","reasons":["이유1","이유2","이유3"],"oneLineTip":"한줄조언"}`;
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: type === 'etf_hint' ? 100 : 1000, messages: [{ role: 'user', content: prompt }] })
    });
    const data = await response.json();
    const text = data.content[0].text;
    if (type === 'etf_hint') return res.status(200).json({ hint: text.trim() });
    const clean = text.replace(/```json|```/g, '').trim();
    return res.status(200).json(JSON.parse(clean));
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
