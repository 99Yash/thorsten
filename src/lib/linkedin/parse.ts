const LINKEDIN_HOSTS = new Set([
	'linkedin.com',
	'www.linkedin.com',
	'm.linkedin.com',
	'linkedin.cn',
	'www.linkedin.cn',
]);

const PERSONAL_PATH_PREFIXES = ['/in/', '/pub/'];

export function isLikelyUsername(input: string): boolean {
	if (!input) return false;
	const trimmed = input.trim();
	// Allow alphanumerics and hyphens (common LinkedIn username pattern)
	if (!/^[a-zA-Z0-9-]{3,100}$/.test(trimmed)) return false;
	// Avoid obvious org/school/company handles
	if (/(company|school|learning|posts|feed|jobs|groups|events)/i.test(trimmed)) return false;
	return true;
}

export function extractLinkedInUsername(raw: string): string | null {
	if (!raw) return null;
	const input = raw.trim();

	// If it's a likely username already, return it
	if (isLikelyUsername(input)) {
		return input;
	}

	// Try parse as URL
	try {
		const url = new URL(input.startsWith('http') ? input : `https://${input}`);
		if (!LINKEDIN_HOSTS.has(url.hostname)) return null;
		const pathname = decodeURIComponent(url.pathname || '');

		for (const prefix of PERSONAL_PATH_PREFIXES) {
			const idx = pathname.toLowerCase().indexOf(prefix);
			if (idx !== -1) {
				const after = pathname.slice(idx + prefix.length);
				const slug = after.split('/')[0].split('?')[0].split('#')[0];
				const cleaned = slug.trim();
				if (isLikelyUsername(cleaned)) {
					return cleaned;
				}
			}
		}
		// Some localized or mwlite paths might include /mwlite/in/<username>
		const parts = pathname.split('/').filter(Boolean);
		const inIdx = parts.findIndex((p) => p.toLowerCase() === 'in');
		if (inIdx !== -1 && parts[inIdx + 1] && isLikelyUsername(parts[inIdx + 1])) {
			return parts[inIdx + 1];
		}
	} catch {
		// not a URL
	}

	return null;
}


