export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const symbols = [
      { symbol: 'NVDA', name: 'NVIDIA', twit: 'NVDA' },
      { symbol: 'TSLA', name: 'Tesla', twit: 'TSLA' },
      { symbol: 'AAPL', name: 'Apple', twit: 'AAPL' },
      { symbol: 'MSFT', name: 'Microsoft', twit: 'MSFT' },
      { symbol: 'AMD', name: 'AMD', twit: 'AMD' },
      { symbol: 'META', name: 'Meta', twit: 'META' },
      { symbol: 'AMZN', name: 'Amazon', twit: 'AMZN' },
      { symbol: 'GOOGL', name: 'Google', twit: 'GOOGL' },
      { symbol: '005930.KS', name: '삼성전자', twit: 'SSNLF' },
      { symbol: '000660.KS', name: 'SK하이닉스', twit: 'HXSCL' },
    ];

    const results = await Promise.all(symbols.map(async (s) => {
      try {
        const r = await fetch(
          `https://api.stocktwits.com/api/2/streams/symbol/${s.twit}.json`,
          { headers: { 'Accept': 'application/json' } }
        );
        const json = await r.json();
        const messages = json?.messages || [];
        const bullish = messages.filter(m => m?.entities?.sentiment?.basic === 'Bullish').length;
        const bearish = messages.filter(m => m?.entities?.sentiment?.basic === 'Bearish').length;
        return {
          symbol: s.symbol,
          name: s.name,
          count: messages.length,
          bullish,
          bearish,
          sentiment: bullish > bearish ? '강세' : bearish > bullish ? '약세' : '중립'
        };
      } catch(e) {
        return { symbol: s.symbol, name: s.name, count: 0, bullish: 0, bearish: 0, sentiment: '중립' };
      }
    }));

    results.sort((a, b) => b.count - a.count);
    return res.status(200).json({ data: results });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
