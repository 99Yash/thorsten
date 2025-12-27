/**
 * Utility functions for formatting LinkedIn profile data
 */

export function initialsOf(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) return 'LN';
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('');
}

export function formatDatePart(
  d?: { year?: number; month?: number; day?: number } | null
): string | undefined {
  if (!d || !d.year) return undefined;
  const month = d.month ? String(d.month).padStart(2, '0') : undefined;
  return month ? `${d.year}-${month}` : String(d.year);
}

export function formatProficiency(proficiency?: string): string {
  if (!proficiency) return '—';
  return proficiency
    .replace(/_/g, ' ')
    .replace(/\bOR\b/gi, '/')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function calculateDuration(
  start?: { year?: number; month?: number; day?: number } | null,
  end?: { year?: number; month?: number; day?: number } | null
): string | undefined {
  if (!start?.year) return undefined;

  const startDate = new Date(
    start.year,
    (start.month || 1) - 1,
    start.day || 1
  );
  const endDate =
    end?.year && end.year > 0
      ? new Date(end.year, (end.month || 1) - 1, end.day || 1)
      : new Date();

  if (endDate.getTime() < startDate.getTime()) {
    // End date is before start date: treat this as invalid data rather than a negative
    // or zero duration. Callers rely on `undefined` here to avoid displaying an
    // incorrect duration for inconsistent date ranges.
    return undefined;
  }

  const diffMs = endDate.getTime() - startDate.getTime();
  const diffMonths = Math.round(diffMs / (1000 * 60 * 60 * 24 * 30.44));

  if (diffMonths < 1) return 'Less than a month';

  const years = Math.floor(diffMonths / 12);
  const months = diffMonths % 12;

  const parts: string[] = [];
  if (years > 0) parts.push(`${years} yr${years > 1 ? 's' : ''}`);
  if (months > 0) parts.push(`${months} mo${months > 1 ? 's' : ''}`);

  return parts.join(' ');
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return 'Unknown';
  }
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  if (diffMs < 0) {
    return 'In the future';
  }

  const diffMonths = Math.round(diffMs / (1000 * 60 * 60 * 24 * 30.44));

  if (diffMonths < 1) {
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  }

  if (diffMonths < 12) {
    return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
  }

  const diffYears = Math.floor(diffMonths / 12);
  const remainingMonths = diffMonths % 12;
  if (remainingMonths === 0) {
    return `${diffYears} year${diffYears > 1 ? 's' : ''} ago`;
  }
  return `${diffYears} year${
    diffYears > 1 ? 's' : ''
  }, ${remainingMonths} month${remainingMonths > 1 ? 's' : ''} ago`;
}

export function isOlderThanThreshold(
  dateString: string | null,
  thresholdMonths: number
): boolean {
  if (!dateString) return true;
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return true;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMonths = Math.round(diffMs / (1000 * 60 * 60 * 24 * 30.44));
  return diffMonths >= thresholdMonths;
}

