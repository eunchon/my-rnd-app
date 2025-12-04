export function formatKRW(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  const sign = value < 0 ? '-' : '';
  let n = Math.abs(Math.trunc(value));
  const eok = Math.floor(n / 100_000_000);
  n -= eok * 100_000_000;
  const cheonman = Math.floor(n / 10_000_000);
  n -= cheonman * 10_000_000;
  const man = Math.floor(n / 10_000);

  const parts: string[] = [];
  if (eok) parts.push(`${eok}억`);
  if (cheonman) parts.push(`${cheonman}천만`);
  if (!eok && !cheonman && man) parts.push(`${man}만`);

  if (!parts.length) parts.push('0');
  return `${sign}${parts.join(' ')} 원`;
}
