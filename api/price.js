export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { symbol } = req.query;
  if (!symbol) return res.status(400).json({ error: 'Symbol required' });

  try {
    // 기본 주가 데이터
    const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    // 상세 지표 데이터
    const quoteUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=summaryDetail,defaultKeyStatistics,financialData,price`;

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json',
      'Referer': 'https://finance.yahoo.com'
    };

    const [chartRes, quoteRes] = await Promise.all([
      fetch(chartUrl, { headers }),
      fetch(quoteUrl, { headers })
    ]);

    const chartData = await chartRes.json();
    const quoteData = await quoteRes.json();

    const meta = chartData.chart.result[0].meta;
    const price = meta.regularMarketPrice;
    const prev = meta.chartPreviousClose || meta.regularMarketPreviousClose;
    const change = ((price - prev) / prev * 100).toFixed(2);
    const isKRX = symbol.includes('.KS') || symbol.includes('.KQ');
    const formatted = isKRX ? `₩${Math.round(price).toLocaleString()}` : `$${price.toFixed(2)}`;

    // 상세 지표 추출
    const result = quoteData?.quoteSummary?.result?.[0];
    const summary = result?.summaryDetail || {};
    const keyStats = result?.defaultKeyStatistics || {};
    const financial = result?.financialData || {};
    const priceData = result?.price || {};

    const marketCap = priceData.marketCap?.raw;
    const formatMarketCap = (val) => {
      if (!val) return '-';
      if (isKRX) {
        const trillion = val / 1e12;
        return trillion >= 1 ? `${trillion.toFixed(0)}조` : `${(val/1e8).toFixed(0)}억`;
      }
      const trillion = val / 1e12;
      return trillion >= 1 ? `$${trillion.toFixed(1)}조` : `$${(val/1e9).toFixed(1)}B`;
    };

    const per = summary.trailingPE?.raw || keyStats.trailingEps?.raw ? 
      (summary.trailingPE?.raw ? summary.trailingPE.raw.toFixed(1) + 'x' : '-') : '-';
    const pbr = keyStats.priceToBook?.raw ? 
      keyStats.priceToBook.raw.toFixed(2) + 'x' : '-';
    const eps = keyStats.trailingEps?.raw ? 
      (isKRX ? `₩${Math.round(keyStats.trailingEps.raw).toLocaleString()}` : `$${keyStats.trailingEps.raw.toFixed(2)}`) : '-';
    const dividend = summary.dividendYield?.raw ? 
      `${(summary.dividendYield.raw * 100).toFixed(2)}%` : '-';
    const week52High = summary.fiftyTwoWeekHigh?.raw ? 
      (isKRX ? `₩${Math.round(summary.fiftyTwoWeekHigh.raw).toLocaleString()}` : `$${summary.fiftyTwoWeekHigh.raw.toFixed(2)}`) : '-';
    const week52Low = summary.fiftyTwoWeekLow?.raw ? 
      (isKRX ? `₩${Math.round(summary.fiftyTwoWeekLow.raw).toLocaleString()}` : `$${summary.fiftyTwoWeekLow.raw.toFixed(2)}`) : '-';
    const volume = meta.regularMarketVolume ? 
      (meta.regularMarketVolume / 1e6).toFixed(1) + '백만주' : '-';
    const roe = financial.returnOnEquity?.raw ? 
      `${(financial.returnOnEquity.raw * 100).toFixed(1)}%` : '-';

    return res.status(200).json({
      price: formatted,
      change: parseFloat(change),
      companyName: meta.longName || meta.shortName || symbol,
      symbol,
      // 실시간 지표
      marketCap: formatMarketCap(marketCap),
      per,
      pbr,
      eps,
      dividend,
      week52High,
      week52Low,
      volume,
      roe
    });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
