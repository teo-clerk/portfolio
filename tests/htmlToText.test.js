import { describe, it, expect } from 'vitest';
import { htmlToText } from '../src/utils/htmlToText.js';
import { cvData } from '../src/data/cvData.js';
import { buildSystemPrompt } from '../src/services/systemPrompt.js';

describe('htmlToText', () => {
  it('strips tags and decodes the entities the CV content uses', () => {
    expect(htmlToText('<strong>AI &amp; Data</strong>&nbsp;&ldquo;x&rdquo; &#39;y&#39;')).toBe(
      'AI & Data “x” \'y\''
    );
  });

  it('turns line breaks and block ends into newlines and collapses blank space', () => {
    expect(htmlToText('<div>one</div><div>two<br>&nbsp;&nbsp;•   three</div>')).toBe(
      'one\ntwo\n• three'
    );
  });

  it('keeps a link target when the visible label does not already show it', () => {
    expect(htmlToText('<a href="https://example.com/paper.pdf" target="_blank">PDF</a>')).toBe(
      'PDF (https://example.com/paper.pdf)'
    );
  });

  it('does not repeat a link target the label already shows', () => {
    expect(
      htmlToText('<a href="https://github.com/teo-clerk/SciNet">github.com/teo-clerk/SciNet</a>')
    ).toBe('github.com/teo-clerk/SciNet');
    expect(htmlToText('<a href="mailto:a@b.co">a@b.co</a>')).toBe('a@b.co');
  });

  it('handles null without throwing', () => {
    expect(htmlToText(null)).toBe('');
  });

  it('leaves no markup or entities in any CV section', () => {
    for (const [key, value] of Object.entries(cvData)) {
      const text = htmlToText(value);
      expect(text, key).not.toMatch(/<[a-z/][^>]*>/i);
      expect(text, key).not.toMatch(/&(amp|nbsp|ldquo|rdquo|lt|gt|quot);/);
      expect(text.length, key).toBeGreaterThan(20);
    }
  });
});

describe('buildSystemPrompt', () => {
  const prompt = buildSystemPrompt();

  it('carries the CV as plain text, not HTML', () => {
    expect(prompt).not.toMatch(/<span|<a |<\/|&nbsp;|&amp;|class="|style="/);
  });

  it('still contains the facts the assistant needs', () => {
    expect(prompt).toContain('FloodFusion');
    expect(prompt).toContain('H-FARM College');
    expect(prompt).toContain('https://github.com/teo-clerk/floodfusion');
  });

  it('is markedly smaller than the raw HTML it replaces', () => {
    expect(prompt.length).toBeLessThan(JSON.stringify(cvData).length);
  });
});
