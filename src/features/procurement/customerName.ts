const SALES_DEPARTMENT_KEYWORDS = ['一部', '二部', '三部', '六部'] as const;

export function pickSalesDepartmentLabel(rawCustomerName: unknown): string {
  const name = String(rawCustomerName || '').trim();
  if (!name) return '';

  const bracketMatch = name.match(/[（(]\s*(一部|二部|三部|六部)\s*[）)]/);
  if (bracketMatch?.[1]) return bracketMatch[1];

  const directMatch = SALES_DEPARTMENT_KEYWORDS.find((keyword) => name.includes(keyword));
  return directMatch || '';
}

export function resolveDisplayCustomerName(rawCustomerName: unknown): string {
  const name = String(rawCustomerName || '').trim();
  if (!name) return '';
  return pickSalesDepartmentLabel(name) || name;
}
