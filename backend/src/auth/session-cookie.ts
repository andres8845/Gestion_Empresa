/** Reads the md_session cookie without allowing malformed percent encoding to escape as a 500. */
export function readSessionToken(cookieHeader?: string): string | undefined {
  if (!cookieHeader) return undefined;

  const entry = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('md_session='));
  if (!entry) return undefined;

  const value = entry.slice('md_session='.length);
  if (!value) return undefined;

  try {
    const token = decodeURIComponent(value);
    return token.length > 0 ? token : undefined;
  } catch {
    return undefined;
  }
}
