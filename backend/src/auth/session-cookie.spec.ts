import { readSessionToken } from './session-cookie.js';

describe('readSessionToken', () => {
  it.each([undefined, '', 'other=value', 'md_session=', 'md_session=%', 'md_session=%ZZ'])(
    'returns no token for absent, empty, or malformed cookies (%s)',
    (cookie) => expect(readSessionToken(cookie)).toBeUndefined(),
  );

  it('decodes a valid cookie value and ignores unrelated cookies', () => {
    expect(readSessionToken('theme=dark; md_session=abc%2D123; lang=es')).toBe('abc-123');
  });
});
