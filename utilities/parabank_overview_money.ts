import type { OverviewAccountTableRow } from '../pages_ui/overview_page';

/**
 * Parses ParaBank **overview** table currency cells (e.g. `$1,234.56`, `$-1,000.00`, `-$500.00`, `($25.00)`).
 */
export function parseParabankMoneyCell(raw: string): number | null {
  const s = raw.replace(/\u00a0/g, ' ').trim();
  const compact = s.replace(/,/g, '');
  if (!/\d+\.\d{2}/.test(compact)) {
    return null;
  }
  let sign = 1;
  if (/^\(.*\)$/.test(s)) {
    sign = -1;
  } else if (/^-/.test(compact.trim()) || /\$-/.test(compact) || /-\$/.test(compact)) {
    sign = -1;
  }
  const m = compact.match(/(\d+\.\d{2})/);
  const digits = m?.[1];
  if (digits === undefined) {
    return null;
  }
  const v = Number.parseFloat(digits);
  if (Number.isNaN(v)) {
    return null;
  }
  return sign * v;
}

/** Every numeric money field in a row (overview: Balance, Available Amount, etc.). */
export function moneyAmountsFromOverviewRow(cells: OverviewAccountTableRow): number[] {
  const out: number[] = [];
  for (const c of cells) {
    const n = parseParabankMoneyCell(c);
    if (n !== null) {
      out.push(n);
    }
  }
  return out;
}

export function findOverviewRowForAccountId(
  rows: OverviewAccountTableRow[],
  accountId: string | number,
): OverviewAccountTableRow | undefined {
  const id = String(accountId);
  return rows.find((cells) => cells.some((c) => c.includes(id)));
}
