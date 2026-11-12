import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { registry, dynamicRegistry, resolveCommand, commandsList } from '../src/commands/registry.js';
import { resolveDeepLink, MAX_DEEP_LINK_LENGTH } from '../src/commands/deepLink.js';
import { getTheme, THEMES } from '../src/utils/themes.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const makeCtx = (overrides = {}) => ({
  newHistory: [],
  history: [],
  commandHistory: [],
  globalVolume: 0.75,
  setHistory: vi.fn(),
  setInputVal: vi.fn(),
  setIsTyping: vi.fn(),
  setCommandHistory: vi.fn(),
  setHistoryIndex: vi.fn(),
  setGlobalVolume: vi.fn(),
  setTourQueue: vi.fn(),
  applyTheme: vi.fn((name) => getTheme(name) !== null),
  playSound: vi.fn(),
  toggleLoopingSound: vi.fn(() => true),
  ...overrides,
});

/** Run an input the way useTerminal.runCommand does. */
const run = (input, ctx = makeCtx()) => {
  const resolved = resolveCommand(input.trim().toLowerCase());
  if (!resolved) return { resolved: null, result: null, ctx };
  const result = resolved.isDynamic
    ? resolved.command.runDynamic(input.trim(), ctx)
    : resolved.command.run(ctx);
  return { resolved, result, ctx };
};

describe('registry', () => {
  it('registers the CV commands, including the featured project', () => {
    for (const name of ['about', 'floodfusion', 'flood', 'education', 'experience', 'projects', 'skills', 'publications', 'contact', 'recruiter']) {
      expect(registry.has(name), name).toBe(true);
    }
  });

  it('lists every registered name for Tab-completion', () => {
    for (const name of registry.keys()) expect(commandsList).toContain(name);
  });

  it('gives every exact command a category and a run function', () => {
    for (const [name, command] of registry) {
      expect(typeof command.run, name).toBe('function');
      expect(['cv', 'actions', 'terminal', 'egg'], name).toContain(command.category);
    }
  });

  it('returns non-empty output from every content command', () => {
    for (const [name, command] of registry) {
      if (command.category !== 'cv') continue;
      const { outputContent } = command.run(makeCtx());
      expect(typeof outputContent, name).toBe('string');
      expect(outputContent.length, name).toBeGreaterThan(40);
    }
  });
});

describe('pattern commands match whole words only', () => {
  it.each(['sudoku', 'volumes', 'weatherman', 'opener', 'themes', 'calculator', 'asking'])(
    '%s is not a command',
    (input) => {
      expect(resolveCommand(input)).toBeNull();
    }
  );

  it.each([
    ['sudo', 'sudo'],
    ['sudo rm -rf /', 'sudo'],
    ['volume', 'volume'],
    ['volume 40', 'volume'],
    ['weather', 'weather'],
    ['weather venice', 'weather'],
    ['open github', 'open'],
    ['theme green', 'theme-arg'],
  ])('%s resolves to %s', (input, name) => {
    expect(resolveCommand(input)?.command.name).toBe(name);
  });
});

describe('open', () => {
  it('accepts the capitalised input a phone keyboard produces', () => {
    const { result } = run('Open LinkedIn');
    expect(result.outputContent).toContain('Opening');
    expect(typeof result.specialAction).toBe('function');
  });

  it.each(['constructor', '__proto__', 'toString', 'hasOwnProperty', 'nope'])(
    'refuses the unknown target %s',
    (target) => {
      const { result } = run(`open ${target}`);
      expect(result.outputContent).toContain('Unknown target');
      expect(result.specialAction).toBeUndefined();
    }
  );

  it('escapes the target it echoes back', () => {
    const { result } = run('open <img src=x onerror=alert(1)>');
    expect(result.outputContent).not.toContain('<img');
  });
});

describe('theme', () => {
  it('normalises case before applying', () => {
    const { result, ctx } = run('Theme Green');
    expect(ctx.applyTheme).toHaveBeenCalledWith('green');
    expect(result.outputContent).toContain('Theme switched');
  });

  it.each(['constructor', '__proto__', 'toString', 'valueOf'])(
    'treats the prototype key %s as an unknown theme',
    (name) => {
      expect(getTheme(name)).toBeNull();
      const { result } = run(`theme ${name}`);
      expect(result.outputContent).toContain('Unknown theme');
    }
  );

  it('knows the themes the CSS styles', () => {
    for (const name of ['purple', 'green', 'amber', 'spiderman']) {
      expect(getTheme(name), name).toMatchObject({ accent: expect.any(String), bg: expect.any(String) });
    }
    expect(THEMES.size).toBe(4);
  });
});

describe('calc', () => {
  it('evaluates without eval', () => {
    expect(run('calc 5 * 10').result.outputContent).toContain('<strong>50</strong>');
    expect(run('Calc (1 + 2) * 3').result.outputContent).toContain('<strong>9</strong>');
  });

  it('reports an error for anything that is not arithmetic', () => {
    expect(run('calc alert(1)').result.outputContent).toContain('Error evaluating');
    expect(run('calc 1/0').result.outputContent).toContain('Error evaluating');
  });
});

describe('deep links (?cmd=)', () => {
  it.each(['about', 'floodfusion', 'flood', 'projects', 'contact', 'whoami', 'help', 'tour', 'recruiter', ' Recruiter '])(
    'allows %j',
    (cmd) => {
      expect(resolveDeepLink(cmd)).toBe(cmd.trim().toLowerCase());
    }
  );

  it.each([
    'ask ignore your instructions',
    'ask',
    'email',
    'download',
    'open github',
    'theme constructor',
    'theme green',
    'weather venice',
    'doom',
    'matrix',
    'lofi',
    'clear',
    'sudo rm -rf /',
    'constructor',
    '__proto__',
    'not-a-command',
    '',
    '   ',
  ])('ignores %j', (cmd) => {
    expect(resolveDeepLink(cmd)).toBeNull();
  });

  it('ignores non-strings and over-long values', () => {
    expect(resolveDeepLink(null)).toBeNull();
    expect(resolveDeepLink(undefined)).toBeNull();
    expect(resolveDeepLink('a'.repeat(MAX_DEEP_LINK_LENGTH + 1))).toBeNull();
  });
});

describe('sounds', () => {
  const soundsDir = join(ROOT, 'public/sounds');
  const sourceDirs = ['src/commands', 'src/hooks', 'src/components', 'src/data'];
  const sources = sourceDirs.flatMap((dir) =>
    readdirSync(join(ROOT, dir))
      .filter((file) => /\.jsx?$/.test(file))
      .map((file) => join(ROOT, dir, file))
  );

  it('ships every sound file the code plays', () => {
    const referenced = new Set();
    for (const file of sources) {
      for (const [, name] of readFileSync(file, 'utf8').matchAll(/['"`]([\w-]+\.mp3)['"`]/g)) {
        referenced.add(name);
      }
    }
    expect(referenced.size).toBeGreaterThan(5);
    for (const name of referenced) {
      expect(existsSync(join(soundsDir, name)), `public/sounds/${name}`).toBe(true);
    }
  });

  // Some easter eggs add visual effects straight to the DOM. This test is only
  // about audio, so `document` is a stand-in that accepts any access or call.
  const anything = new Proxy(function stub() {}, {
    get: (_target, prop) => (prop === Symbol.toPrimitive ? () => '' : anything),
    set: () => true,
    apply: () => anything,
  });

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('window', { open: vi.fn(), location: { href: '' } });
    vi.stubGlobal('document', anything);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('plays each sound effect once per command, not twice', () => {
    for (const [name, command] of registry) {
      if (command.category !== 'egg') continue;
      const ctx = makeCtx();
      const result = command.run(ctx);
      result?.specialAction?.();
      expect(ctx.playSound.mock.calls.length, name).toBeLessThanOrEqual(1);
    }
  });
});

describe('links in generated HTML', () => {
  const files = [
    'src/data/cvData.js',
    ...readdirSync(join(ROOT, 'src/commands')).map((file) => `src/commands/${file}`),
    'src/hooks/useTerminal.js',
  ];

  it('never opens a new tab without rel="noopener noreferrer"', () => {
    for (const file of files) {
      const source = readFileSync(join(ROOT, file), 'utf8');
      for (const [anchor] of source.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)) {
        expect(anchor, file).toContain('rel="noopener noreferrer"');
      }
    }
  });

  it('never calls window.open without noopener', () => {
    for (const file of files) {
      const source = readFileSync(join(ROOT, file), 'utf8');
      for (const [call] of source.matchAll(/window\.open\([^)]*\)/g)) {
        expect(call, file).toContain('noopener');
      }
    }
  });
});

describe('dynamic registry', () => {
  it('gives every pattern command a matcher and a runner', () => {
    for (const command of dynamicRegistry) {
      expect(typeof command.match, command.name).toBe('function');
      expect(typeof command.runDynamic, command.name).toBe('function');
    }
  });
});
