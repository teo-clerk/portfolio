import { useEffect, useMemo, useRef, useState } from 'react';
import { registry, dynamicRegistry } from '../commands/registry';

/**
 * Fuzzy subsequence match. Returns a score (lower is better) or null.
 * "clc" matches "calc"; an exact prefix always outranks a scattered match.
 */
const fuzzyScore = (needle, haystack) => {
  if (!needle) return 0;
  const n = needle.toLowerCase();
  const h = haystack.toLowerCase();

  if (h.startsWith(n)) return -100 + h.length;
  const direct = h.indexOf(n);
  if (direct !== -1) return direct;

  let score = 0;
  let hi = 0;
  for (const char of n) {
    const found = h.indexOf(char, hi);
    if (found === -1) return null;
    score += found - hi;
    hi = found + 1;
  }
  return 50 + score;
};

const buildEntries = () => {
  const seen = new Set();
  const entries = [];

  for (const [name, command] of registry) {
    if (!command.description || command.aliasOf) continue;
    if (seen.has(command.name)) continue;
    seen.add(command.name);
    entries.push({ name, label: command.usage ?? name, description: command.description });
  }
  for (const command of dynamicRegistry) {
    if (!command.description) continue;
    entries.push({
      name: command.name,
      label: command.usage ?? command.name,
      description: command.description,
    });
  }
  return entries.sort((a, b) => a.name.localeCompare(b.name));
};

const CommandPalette = ({ onClose, onRun }) => {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const previousFocus = useRef(null);

  const entries = useMemo(() => buildEntries(), []);

  const results = useMemo(() => {
    return entries
      .map((entry) => {
        const score = Math.min(
          fuzzyScore(query, entry.name) ?? Infinity,
          (fuzzyScore(query, entry.description) ?? Infinity) + 200
        );
        return { entry, score };
      })
      .filter((r) => Number.isFinite(r.score))
      .sort((a, b) => a.score - b.score)
      .slice(0, 40)
      .map((r) => r.entry);
  }, [entries, query]);

  // Mounted fresh on every open, so focus management is all this needs.
  useEffect(() => {
    previousFocus.current = document.activeElement;
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      cancelAnimationFrame(id);
      // Restore focus so keyboard users are not dumped at the top of the page.
      if (previousFocus.current instanceof HTMLElement) previousFocus.current.focus();
    };
  }, []);

  // Keep the active row in view when arrowing through a long list.
  useEffect(() => {
    const el = listRef.current?.querySelector('[data-active="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const choose = (entry) => {
    if (!entry) return;
    onRun(entry.name);
    onClose();
  };

  const activeIndex = Math.min(active, Math.max(results.length - 1, 0));

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (results.length ? (i + 1) % results.length : 0));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (results.length ? (i - 1 + results.length) % results.length : 0));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      choose(results[activeIndex]);
    }
  };

  return (
    <div
      className="palette-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="palette"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          className="palette-input"
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setActive(0); }}
          onKeyDown={handleKeyDown}
          placeholder="Search commands…"
          aria-label="Search commands"
          aria-controls="palette-results"
          aria-activedescendant={results[activeIndex] ? `palette-opt-${results[activeIndex].name}` : undefined}
          autoComplete="off"
          spellCheck="false"
        />

        <ul className="palette-results" id="palette-results" role="listbox" ref={listRef}>
          {results.length === 0 && (
            <li className="palette-empty">No matching command</li>
          )}
          {results.map((entry, i) => (
            <li
              key={entry.name}
              id={`palette-opt-${entry.name}`}
              role="option"
              aria-selected={i === activeIndex}
              data-active={i === activeIndex}
              className="palette-row"
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(entry)}
            >
              <span className="palette-cmd">{entry.label}</span>
              <span className="palette-desc">{entry.description}</span>
            </li>
          ))}
        </ul>

        <div className="palette-hint">
          <span>↑↓ navigate</span>
          <span>↵ run</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
