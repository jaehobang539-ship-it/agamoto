export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { symbol } = req.query;
  if (!symbol) return res.status(400).json({ error: 'Symbol required' });

  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://finance.yahoo.com',
      'Origin': 'https://finance.yahoo.com'
    };

    // v8 chart API (주가)
    const chartUrl = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d&includePrePost=false`;
    // v11 quoteSummary (상세 지표)
    const quoteUrl = `https://query2.finance.yahoo.com/v11/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=summaryDetail%2CdefaultKeyStatistics%2CfinancialData%2Cprice&crumb=`;

    const chartRes = await fetch(chartUrl, { headers });
    const chartData = await chartRes.json();
    const meta = chartData.chart.result[0].meta;
    const price = meta.regularMarketPrice;
    const prev = meta.chartPreviousClose || meta.regularMarketPreviousClose;
    const change = ((price - prev) / prev * 100).toFixed(2);
    const isKRX = symbol.includes('.KS') || symbol.includes('.KQ');
    const formatted = isKRX ? `₩${Math.round(price).toLocaleString()}` : `$${price.toFixed(2)}`;
    const volume = meta.regularMarketVolume ? `${(meta.regularMarketVolume / 1e6).toFixed(1)}백만주` : '-';

    // v7 quote API로 상세 지표 가져오기
    const v7Url = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}&fields=trailingPE,forwardPE,priceToBook,trailingEps,dividendYield,returnOnEquity,marketCap,fiftyTwoWeekHigh,fiftyTwoWeekLow,regularMarketVolume,longName,shortName`;
    const v7Res = await fetch(v7Url, { headers });
    const v7Data = await v7Res.json();
    const q = v7Data?.quoteResponse?.result?.[0] || {};

    const formatMarketCap = (val) => {
      if (!val) return '-';
      if (isKRX) {
        const trillion = val / 1e12;
        return trillion >= 1 ? `${trillion.toFixed(0)}조` : `${(val/1e8).toFixed(0)}억`;
      }
      const trillion = val / 1e12;
      return trillion >= 1 ? `$${trillion.toFixed(1)}조` : `$${(val/1e9).toFixed(1)}B`;
    };

    const per = q.trailingPE ? `${q.trailingPE.toFixed(1)}x` : (q.forwardPE ? `${q.forwardPE.toFixed(1)}x (선행)` : '-');
    const pbr = q.priceToBook ? `${q.priceToBook.toFixed(2)}x` : '-';
    const eps = q.trailingEps ? (isKRX ? `₩${Math.round(q.trailingEps).toLocaleString()}` : `$${q.trailingEps.toFixed(2)}`) : '-';
    const dividend = q.dividendYield ? `${(q.dividendYield * 100).toFixed(2)}%` : '-';
    const roe = q.returnOnEquity ? `${(q.returnOnEquity * 100).toFixed(1)}%` : '-';
    const marketCap = formatMarketCap(q.marketCap);
    const week52High = q.fiftyTwoWeekHigh ? (isKRX ? `₩${Math.round(q.fiftyTwoWeekHigh).toLocaleString()}` : `$${q.fiftyTwoWeekHigh.toFixed(2)}`) : '-';
    const week52Low = q.fiftyTwoWeekLow ? (isKRX ? `₩${Math.round(q.fiftyTwoWeekLow).toLocaleString()}` : `$${q.fiftyTwoWeekLow.toFixed(2)}`) : '-';
    const companyName = q.longName || q.shortName || meta.longName || meta.shortName || symbol;

    return res.status(200).json({
      price: formatted,
      change: parseFloat(change),
      companyName,
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
