export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    const subreddits = ['wallstreetbets', 'stocks', 'investing'];
    const allTexts = [];
    for (const sub of subreddits) {
      const r = await fetch(`https://www.reddit.com/r/${sub}/hot.json?limit=25`, {
        headers: { 'User-Agent': 'Agamoto/1.0' }
      });
      const json = await r.json();
      json.data.children.forEach(c => {
        allTexts.push(c.data.title + ' ' + (c.data.selftext || ''));
      });
    }
    const symbols = [
      { symbol: 'NVDA', name: 'NVIDIA', aliases: ['nvda', 'nvidia'] },
      { symbol: 'TSLA', name: 'Tesla', aliases: ['tsla', 'tesla'] },
      { symbol: 'AAPL', name: 'Apple', aliases: ['aapl', 'apple'] },
      { symbol: 'MSFT', name: 'Microsoft', aliases: ['msft', 'microsoft'] },
      { symbol: 'AMD', name: 'AMD', aliases: ['amd'] },
      { symbol: 'META', name: 'Meta', aliases: ['meta', 'facebook'] },
      { symbol: 'AMZN', name: 'Amazon', aliases: ['amzn', 'amazon'] },
      { symbol: 'GOOGL', name: 'Google', aliases: ['googl', 'google'] },
      { symbol: '005930.KS', name: '삼성전자', aliases: ['삼성전자', 'samsung'] },
      { symbol: '000660.KS', name: 'SK하이닉스', aliases: ['sk하이닉스', 'hynix'] },
    ];
    const combined = allTexts.join(' ').toLowerCase();
    const results = symbols.map(s => ({
      symbol: s.symbol, name: s.name,
      count: s.aliases.reduce((acc, alias) => {
        const matches = combined.match(new RegExp(alias, 'gi'));
        return acc + (matches ? matches.length : 0);
      }, 0)
    }));
    results.sort((a, b) => b.count - a.count);
    return res.status(200).json({ data: results });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
