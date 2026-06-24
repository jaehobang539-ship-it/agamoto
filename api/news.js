export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { symbol } = req.query;
  if (!symbol) return res.status(400).json({ error: 'Symbol required' });

  try {
    const rssUrl = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(symbol)}&region=US&lang=en-US`;
    const r = await fetch(rssUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/rss+xml' }
    });
    const text = await r.text();

    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(text)) !== null && items.length < 5) {
      const item = match[1];
      const title = (item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/))?.[1] || '';
      const link = (item.match(/<link>(.*?)<\/link>/))?.[1] || '#';
      const pubDate = (item.match(/<pubDate>(.*?)<\/pubDate>/))?.[1] || '';
      const source = (item.match(/<source[^>]*>(.*?)<\/source>/))?.[1] || 'Yahoo Finance';
      const date = pubDate ? new Date(pubDate) : null;
      const diff = date ? Math.floor((Date.now() - date) / 60000) : null;
      const timeAgo = diff !== null ? (diff < 60 ? `${diff}분 전` : diff < 1440 ? `${Math.floor(diff/60)}시간 전` : `${Math.floor(diff/1440)}일 전`) : '';

      // 감성 분석
      const pos = ['surge', 'rise', 'gain', 'bull', 'beat', 'record', 'high', 'growth', 'profit', '급등', '상승', '호재'];
      const neg = ['fall', 'drop', 'loss', 'bear', 'miss', 'low', 'decline', 'warn', '급락', '하락', '악재'];
      const tLower = title.toLowerCase();
      let sentiment = '📰 중립';
      if (pos.some(w => tLower.includes(w))) sentiment = '🔥 호재';
      else if (neg.some(w => tLower.includes(w))) sentiment = '💧 악재';

      items.push({ title, link, timeAgo, source, sentiment });
    }

    return res.status(200).json({ news: items });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
