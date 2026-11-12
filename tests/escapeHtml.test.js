import { describe, it, expect } from 'vitest';
import { escapeHtml, sanitizeAiHtml } from '../src/utils/escapeHtml.js';

describe('escapeHtml', () => {
  it('escapes every character that can open markup or an attribute', () => {
    expect(escapeHtml(`<img src=x onerror="alert('x')">&`)).toBe(
      '&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt;&amp;'
    );
  });

  it('turns null and undefined into an empty string', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });
});

describe('sanitizeAiHtml', () => {
  it('keeps the allow-listed inline tags', () => {
    const html = '<strong>a</strong> <em>b</em> <b>c</b> <i>d</i><br><code>e</code><br/>';
    expect(sanitizeAiHtml(html)).toBe(html);
  });

  it.each([
    ['<img src=x onerror=alert(1)>'],
    ['<script>alert(1)</script>'],
    ['<a href="javascript:alert(1)">x</a>'],
    ['<iframe src="https://example.com"></iframe>'],
    ['<svg onload=alert(1)>'],
    ['<strong onclick="alert(1)">x</strong>'],
    ['<b style="position:fixed">x</b>'],
    ['<br onfocus=alert(1) autofocus>'],
  ])('neutralises %s', (payload) => {
    const out = sanitizeAiHtml(payload);
    // Whatever survives must contain no tag other than the bare allow-listed ones.
    const tags = out.match(/<[^>]*>/g) ?? [];
    for (const tag of tags) {
      expect(tag).toMatch(/^<\/?(strong|em|b|i|br|code)\s*\/?>$/i);
    }
    expect(out).not.toMatch(/<(img|script|a|iframe|svg)\b/i);
    expect(out).not.toMatch(/<[^>]*\bon\w+\s*=/i);
    expect(out).not.toMatch(/<[^>]*\bstyle\s*=/i);
  });

  it('cannot be tricked into restoring a forged placeholder', () => {
    const nul = String.fromCharCode(0);
    const out = sanitizeAiHtml(`${nul}0${nul}<img src=x onerror=alert(1)>`);
    expect(out).not.toContain('<img');
    expect(out).not.toContain(nul);
  });

  it('handles null without throwing', () => {
    expect(sanitizeAiHtml(null)).toBe('');
  });
});
