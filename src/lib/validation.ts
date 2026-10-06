export function isValidHttpUrl(url: string | null | undefined): boolean {
  if (!url) return true; // Empty is allowed
  try {
    const parsed = new URL(url);
    // CWE-20/601: Only allow http/https, deny javascript:, data:, file:
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (e) {
    return false;
  }
}
