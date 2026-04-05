import type { Instrument } from '@/types'

const inst = (
  id: string,
  symbol: string,
  name: string,
  assetClass: Instrument['assetClass'],
  exchange: string,
  baseCurrency: string,
  quoteCurrency: string,
  extra: Partial<Pick<Instrument, 'contractType' | 'tickSize' | 'lotSize'>> & {
    sector?: string
  } = {},
): Instrument => ({
  id,
  symbol,
  name,
  assetClass,
  exchange,
  baseCurrency,
  quoteCurrency,
  contractType: extra.contractType ?? null,
  tickSize: extra.tickSize ?? 0.01,
  lotSize: extra.lotSize ?? 1,
  metadata: {
    listingDate: '2020-01-01',
    sector: extra.sector ?? null,
  },
})

export const INSTRUMENTS: Instrument[] = [
  inst('BTC-USD-SPOT', 'BTC/USD', 'Bitcoin',            'crypto_spot', 'Binance',         'BTC', 'USD', { tickSize: 0.01 }),
  inst('ETH-USD-SPOT', 'ETH/USD', 'Ethereum',           'crypto_spot', 'Binance',         'ETH', 'USD', { tickSize: 0.01 }),
  inst('SOL-USD-SPOT', 'SOL/USD', 'Solana',             'crypto_spot', 'Binance',         'SOL', 'USD', { tickSize: 0.001 }),
  inst('BTC-PERP',     'BTC-PERP','Bitcoin Perpetual',  'crypto_perp', 'Binance Futures', 'BTC', 'USD', { contractType: 'perpetual' }),
  inst('ETH-PERP',     'ETH-PERP','Ethereum Perpetual', 'crypto_perp', 'Binance Futures', 'ETH', 'USD', { contractType: 'perpetual' }),
  inst('AAPL', 'AAPL', 'Apple Inc.',        'us_equity', 'NASDAQ',    'AAPL', 'USD', { sector: 'Technology' }),
  inst('MSFT', 'MSFT', 'Microsoft Corp.',   'us_equity', 'NASDAQ',    'MSFT', 'USD', { sector: 'Technology' }),
  inst('NVDA', 'NVDA', 'NVIDIA Corp.',      'us_equity', 'NASDAQ',    'NVDA', 'USD', { sector: 'Technology' }),
  inst('TSLA', 'TSLA', 'Tesla Inc.',        'us_equity', 'NASDAQ',    'TSLA', 'USD', { sector: 'Consumer Discretionary' }),
  inst('EUR-USD', 'EUR/USD', 'Euro / US Dollar',              'forex', 'Interbank', 'EUR', 'USD', { tickSize: 0.00001 }),
  inst('GBP-USD', 'GBP/USD', 'British Pound / US Dollar',    'forex', 'Interbank', 'GBP', 'USD', { tickSize: 0.00001 }),
  inst('USD-JPY', 'USD/JPY', 'US Dollar / Japanese Yen',     'forex', 'Interbank', 'USD', 'JPY', { tickSize: 0.001 }),
  inst('SPX', 'SPX', 'S&P 500 Index',     'index', 'CBOE',  'SPX', 'USD'),
  inst('NDX', 'NDX', 'Nasdaq 100 Index',  'index', 'CBOE',  'NDX', 'USD'),
  inst('XAU-USD', 'XAU/USD', 'Gold Spot',      'commodity', 'COMEX', 'XAU', 'USD'),
  inst('XAG-USD', 'XAG/USD', 'Silver Spot',    'commodity', 'COMEX', 'XAG', 'USD'),
  inst('WTI',     'CL',      'WTI Crude Oil',  'commodity', 'NYMEX', 'CL',  'USD'),
  inst('NG',      'NG',      'Natural Gas',    'commodity', 'NYMEX', 'NG',  'USD'),
  inst('HG',      'HG',      'Copper',         'commodity', 'COMEX', 'HG',  'USD'),
]

export const INSTRUMENT_MAP: Record<string, Instrument> = Object.fromEntries(
  INSTRUMENTS.map((i) => [i.id, i]),
)
