const UNAMBIGUOUS_CHARACTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateRandomPassword(length = 6) {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += UNAMBIGUOUS_CHARACTERS.charAt(
      Math.floor(Math.random() * UNAMBIGUOUS_CHARACTERS.length),
    );
  }
  return result;
}

export function humanizeLabel(value: string | undefined | null): string {
  if (!value) {
    return '—';
  }

  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatDateTime(value: Date | string | undefined | null): string {
  if (!value) {
    return '—';
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatDate(value: Date | string | undefined | null): string {
  if (!value) {
    return '—';
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDownloadFilename(parts: Array<string | undefined>): string {
  const name = parts
    .map((part) =>
      (part ?? '')
        .trim()
        .replace(/[\r\n"]/g, '')
        .replace(/[\\/:*?<>|]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter(Boolean)
    .join('-')
    .slice(0, 120);

  return name || 'album';
}
