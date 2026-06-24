export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { symbol } = req.query;
  if (!symbol) return res.status(400).json({ error: 'Symbol required' });

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Referer': 'https://finance.yahoo.com'
      }
    });
    const data = await r.json();
    const meta = data.chart.result[0].meta;
    const price = meta.regularMarketPrice;
    const prev = meta.chartPreviousClose || meta.regularMarketPreviousClose;
    const change = ((price - prev) / prev * 100).toFixed(2);
    const isKRX = symbol.includes('.KS') || symbol.includes('.KQ');
    const formatted = isKRX ? `₩${Math.round(price).toLocaleString()}` : `$${price.toFixed(2)}`;
    return res.status(200).json({
      price: formatted,
      change: parseFloat(change),
      companyName: meta.longName || meta.shortName || symbol,
      symbol
    });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
