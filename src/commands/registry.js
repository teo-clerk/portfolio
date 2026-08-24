/**
 * Command registry.
 *
 * Single source of truth. `commandsList` (Tab-completion, the `commands`
 * listing) and `helpText` are DERIVED from the command modules, so adding a
 * command means adding one object to one category module — there is no
 * parallel array or hand-written help screen to keep in sync.
 *
 * Registering the same name twice throws in development rather than silently
 * shadowing, which is how the previous hand-maintained list drifted.
 */
import { CATEGORY_LABELS, CATEGORY_ORDER } from './types';
import { setDerived, setDelegate } from './derived';
import { contentCommands } from './content.commands';
import { cvCommands } from './cv.commands';
import { actionCommands } from './actions.commands';
import { terminalCommands } from './terminal.commands';
import { eastereggCommands } from './eastereggs.commands';
import { dynamicCommands } from './dynamic.commands';

const exactModules = [
  ...contentCommands,
  ...cvCommands,
  ...actionCommands,
  ...terminalCommands,
  ...eastereggCommands,
];

/** name -> Command, for O(1) exact lookup. */
export const registry = new Map();

const register = (name, command) => {
  if (registry.has(name)) {
    const message = `Duplicate command registration: "${name}"`;
    if (import.meta.env.DEV) throw new Error(message);
    console.error(message);
    return;
  }
  registry.set(name, command);
};

for (const command of exactModules) {
  register(command.name, command);
  // `aliases` registers extra spellings against the same command; `aliasOf` is
  // the inverse, used by legacy entries that carry their own body.
  for (const alias of command.aliases ?? []) register(alias, command);
}

/** Ordered list of pattern-matched commands. Order is significant. */
export const dynamicRegistry = dynamicCommands;

/**
 * Resolve an input string to a command.
 * Exact match first, then the first matching pattern command.
 */
export const resolveCommand = (lowerCmd) => {
  const exact = registry.get(lowerCmd);
  if (exact) return { command: exact, isDynamic: false };

  const dynamic = dynamicRegistry.find((c) => c.match(lowerCmd));
  if (dynamic) return { command: dynamic, isDynamic: true };

  return null;
};

// ── Derived: Tab-completion / `commands` listing ────────────────────
export const commandsList = [
  ...registry.keys(),
  ...dynamicRegistry.filter((c) => c.description).map((c) => c.name),
].sort();

// ── Derived: the `help` screen ──────────────────────────────────────
const documented = [...exactModules, ...dynamicRegistry].filter(
  (c) => c.description && !c.aliasOf
);

const renderHelp = () => {
  const sections = CATEGORY_ORDER.map((category) => {
    const rows = documented.filter((c) => c.category === category);
    if (rows.length === 0) return '';

    const items = rows
      .map((c) => {
        const label = c.usage ?? c.name;
        return `<div class="help-item"><span class="command-highlight" data-cmd="${c.name}">${label}</span><span class="help-desc">${c.description}</span></div>`;
      })
      .join('');

    return `<div class="section-title">── ${CATEGORY_LABELS[category]} ──</div><div class="help-grid">${items}</div>`;
  }).join('');

  return `
<div class="help-container">
  <div class="section-title">AVAILABLE COMMANDS</div>
  ${sections}
  <div class="section-title">── ${CATEGORY_LABELS.egg} ──</div>
  <div style="color:#ccc; margin-top:6px;">
    There are several hidden easter eggs scattered throughout this terminal.
    Try to find them all! (Hint: type <span class="command-highlight" data-cmd="easter eggs">easter eggs</span> if you give up.)
  </div>
</div><br>`;
};

export const helpText = renderHelp();

setDerived(helpText, commandsList);

setDelegate((name, ctx) => {
  const command = registry.get(name);
  if (!command) {
    console.error(`Unknown command delegated to: "${name}"`);
    return null;
  }
  return command.run(ctx);
});
