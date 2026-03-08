export function createRowId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function decodeIssuePathKey(raw: string): string {
  const text = String(raw || '').trim();
  if (!text) return '';
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    try {
      return String(JSON.parse(text));
    } catch {
      return text.slice(1, -1);
    }
  }
  return text;
}

export async function scrollToFirstIssueElement(primarySelector: string, fallbackSelector?: string) {
  const primary = document.querySelector(primarySelector) as HTMLElement | null;
  if (primary) {
    primary.scrollIntoView({ behavior: 'smooth', block: 'center' });
    primary.classList.add('ring-2', 'ring-amber-300');
    setTimeout(() => primary.classList.remove('ring-2', 'ring-amber-300'), 1200);
    return;
  }
  if (fallbackSelector) {
    const fallback = document.querySelector(fallbackSelector) as HTMLElement | null;
    if (fallback) fallback.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}
