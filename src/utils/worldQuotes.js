import { Capacitor, CapacitorHttp } from '@capacitor/core';

/** עשרים החברות הציבוריות הגדולות. באפליקציה המחיר מגיע חי, ובדפדפן דרך שרת הפיתוח. */
export const WORLD_LEADERS = [
  { symbol: 'NVDA', name: 'אנבידיה' },
  { symbol: 'AAPL', name: 'אפל' },
  { symbol: 'MSFT', name: 'מיקרוסופט' },
  { symbol: 'GOOGL', name: 'גוגל' },
  { symbol: 'AMZN', name: 'אמזון' },
  { symbol: 'META', name: 'מטא' },
  { symbol: 'AVGO', name: 'ברודקום' },
  { symbol: 'TSM', name: 'TSMC' },
  { symbol: 'BRK-B', name: 'ברקשייר' },
  { symbol: 'LLY', name: 'אלי לילי' },
  { symbol: 'TSLA', name: 'טסלה' },
  { symbol: 'WMT', name: 'וולמארט' },
  { symbol: 'JPM', name: "ג'יי.פי מורגן" },
  { symbol: 'V', name: 'ויזה' },
  { symbol: 'ORCL', name: 'אורקל' },
  { symbol: 'XOM', name: 'אקסון מוביל' },
  { symbol: 'MA', name: 'מאסטרקארד' },
  { symbol: 'COST', name: 'קוסטקו' },
  { symbol: 'NFLX', name: 'נטפליקס' },
  { symbol: 'HD', name: 'הום דיפו' },
];

export function formatUsd(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

async function fetchChart(symbol) {
  const query = `${encodeURIComponent(symbol)}?interval=1d&range=1mo`;
  if (Capacitor.isNativePlatform()) {
    const response = await CapacitorHttp.get({
      url: `https://query1.finance.yahoo.com/v8/finance/chart/${query}`,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0',
      },
      responseType: 'json',
    });
    if (response.status < 200 || response.status >= 300) throw new Error('quote failed');
    return response.data;
  }
  const response = await fetch(`/market-quotes/v8/finance/chart/${query}`);
  if (!response.ok) throw new Error('quote failed');
  return response.json();
}

export async function loadWorldQuotes() {
  const rows = await Promise.all(WORLD_LEADERS.map(async (item) => {
    const json = await fetchChart(item.symbol);
    const result = json.chart?.result?.[0];
    const meta = result?.meta || {};
    const closes = (result?.indicators?.quote?.[0]?.close || []).filter((n) => Number.isFinite(n));
    const price = Number(meta.regularMarketPrice);
    if (!Number.isFinite(price)) return null;
    return {
      symbol: item.symbol,
      name: item.name,
      price,
      change: Number(meta.regularMarketChangePercent) || 0,
      sparkline: closes.slice(-24),
    };
  }));
  return rows.filter(Boolean);
}
