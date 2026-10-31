/**
 * Client-side copy of the server's invoice maths, for the live preview only.
 * The server recalculates every total on save and on issue; it is the source of truth.
 */
export type TaxTypeValue = 'NONE' | 'INTRA_STATE' | 'INTER_STATE';

export interface PreviewLine {
  quantityMilli: number;
  unitPriceMinor: number;
  discountMinor: number;
  taxRateBps: number;
}

const divRound = (a: bigint, b: bigint) => (a * 2n + b) / (2n * b);

export function previewTotals(lines: PreviewLine[], taxType: TaxTypeValue) {
  let subtotal = 0n;
  let discount = 0n;
  let cgst = 0n;
  let igst = 0n;
  const lineTotals: number[] = [];
  for (const l of lines) {
    const gross = divRound(BigInt(l.quantityMilli) * BigInt(l.unitPriceMinor), 1000n);
    const d = BigInt(Math.min(l.discountMinor, Number(gross)));
    const taxable = gross - d;
    const bps = BigInt(taxType === 'NONE' ? 0 : l.taxRateBps);
    let tax = 0n;
    if (taxType === 'INTRA_STATE') {
      const half = divRound(taxable * bps, 20_000n);
      cgst += half;
      tax = half * 2n;
    } else if (taxType === 'INTER_STATE') {
      tax = divRound(taxable * bps, 10_000n);
      igst += tax;
    }
    subtotal += gross;
    discount += d;
    lineTotals.push(Number(taxable + tax));
  }
  const taxable = subtotal - discount;
  const taxTotal = cgst * 2n + igst;
  return {
    lineTotals,
    subtotalMinor: Number(subtotal),
    discountMinor: Number(discount),
    taxableMinor: Number(taxable),
    cgstMinor: Number(cgst),
    sgstMinor: Number(cgst),
    igstMinor: Number(igst),
    taxTotalMinor: Number(taxTotal),
    grandTotalMinor: Number(taxable + taxTotal),
  };
}
