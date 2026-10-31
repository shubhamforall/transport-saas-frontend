/**
 * Money and quantity parsing without floating point. The API works in integer paise and
 * thousandths; users type rupees ("12,000.50") and decimals ("2.5").
 */

/** "12,000.50" -> 1200050. Returns null for invalid input or more than 2 decimals. */
export function parseRupees(input: string): number | null {
  const s = input.replace(/[₹,\s]/g, '');
  if (s === '') return null;
  const m = /^(\d{1,9})(?:\.(\d{0,2}))?$/.exec(s);
  if (!m) return null;
  const whole = Number(m[1]);
  const frac = Number((m[2] ?? '').padEnd(2, '0'));
  return whole * 100 + frac;
}

/** 1200050 -> "12000.50" (for input fields). */
export function paiseToInput(paise: number | null | undefined): string {
  if (paise === null || paise === undefined) return '';
  const r = Math.floor(paise / 100);
  const p = paise % 100;
  return p ? `${r}.${String(p).padStart(2, '0')}` : String(r);
}

/** "2.5" -> 2500. Up to 3 decimals. */
export function parseMilli(input: string): number | null {
  const s = input.replace(/[,\s]/g, '');
  if (s === '') return null;
  const m = /^(\d{1,7})(?:\.(\d{0,3}))?$/.exec(s);
  if (!m) return null;
  return Number(m[1]) * 1000 + Number((m[2] ?? '').padEnd(3, '0'));
}

/** 2500 -> "2.5" */
export function milliToInput(milli: number | null | undefined): string {
  if (milli === null || milli === undefined) return '';
  const whole = Math.floor(milli / 1000);
  const frac = milli % 1000;
  return frac ? `${whole}.${String(frac).padStart(3, '0').replace(/0+$/, '')}` : String(whole);
}

/** GST basis points <-> percent: 1800 <-> "18" */
export const bpsToPercent = (bps: number) => (bps / 100).toString();
export const GST_RATES = [0, 500, 1200, 1800, 2800] as const;
