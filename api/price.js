const FINNHUB_KEY = 'd8vkna9r01qgrv4p3u1gd8vkna9r01qgrv4p3u20';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { symbol } = req.query;
  if (!symbol) return res.status(400).json({ error: 'Symbol required' });

  try {
    const isKRX = symbol.includes('.KS') || symbol.includes('.KQ');
    const finnhubSymbol = isKRX ? symbol.replace('.KS','').replace('.KQ','') : symbol;

    const headers = {
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'application/json',
      'Referer': 'https://finance.yahoo.com'
    };

    // Yahoo Finance로 실시간 주가
    const chartUrl = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const chartRes = await fetch(chartUrl, { headers });
    const chartData = await chartRes.json();
    const meta = chartData.chart.result[0].meta;
    const price = meta.regularMarketPrice;
    const prev = meta.chartPreviousClose || meta.regularMarketPreviousClose;
    const change = ((price - prev) / prev * 100).toFixed(2);
    const formatted = isKRX ? `₩${Math.round(price).toLocaleString()}` : `$${price.toFixed(2)}`;
    const volume = meta.regularMarketVolume ? `${(meta.regularMarketVolume / 1e6).toFixed(1)}백만주` : '-';
    const companyName = meta.longName || meta.shortName || symbol;

    // Finnhub으로 상세 지표
    const [metricRes, profileRes] = await Promise.all([
      fetch(`https://finnhub.io/api/v1/stock/metric?symbol=${finnhubSymbol}&metric=all&token=${FINNHUB_KEY}`),
      fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${finnhubSymbol}&token=${FINNHUB_KEY}`)
    ]);

    const metricData = await metricRes.json();
    const profileData = await profileRes.json();
    const m = metricData.metric || {};

    const formatMarketCap = (val) => {
      if (!val) return '-';
      if (isKRX) {
        const trillion = val / 1e12;
        return trillion >= 1 ? `${trillion.toFixed(0)}조` : `${(val/1e8).toFixed(0)}억`;
      }
      const b = val / 1e9;
      return b >= 1000 ? `$${(b/1000).toFixed(1)}조` : `$${b.toFixed(1)}B`;
    };

    const per = m['peNormalizedAnnual'] ? `${m['peNormalizedAnnual'].toFixed(1)}x` : (m['peTTM'] ? `${m['peTTM'].toFixed(1)}x` : '-');
    const pbr = m['pbAnnual'] ? `${m['pbAnnual'].toFixed(2)}x` : '-';
    const eps = m['epsNormalizedAnnual'] ? `$${m['epsNormalizedAnnual'].toFixed(2)}` : '-';
    const dividend = m['dividendYieldIndicatedAnnual'] ? `${m['dividendYieldIndicatedAnnual'].toFixed(2)}%` : '-';
    const roe = m['roeRfy'] ? `${m['roeRfy'].toFixed(1)}%` : '-';
    const week52High = m['52WeekHigh'] ? `$${m['52WeekHigh'].toFixed(2)}` : '-';
    const week52Low = m['52WeekLow'] ? `$${m['52WeekLow'].toFixed(2)}` : '-';
    const marketCapRaw = profileData.marketCapitalization ? profileData.marketCapitalization * 1e6 : null;
    const marketCap = formatMarketCap(marketCapRaw);

    return res.status(200).json({
      price: formatted,
      change: parseFloat(change),
      companyName: profileData.name || companyName,
      symbol,
      per,
      pbr,
      eps,
      dividend,
      roe,
      marketCap,
      week52High,
      week52Low,
      volume
    });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
