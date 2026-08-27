/**
 * Lazily-populated holder for text the registry derives from the command
 * modules themselves.
 *
 * `help` and `commands` need to render the derived output, but the registry
 * imports the command modules — so the modules cannot import the registry back
 * without a cycle. They read through this tiny module instead, which the
 * registry fills in once at startup.
 */
let helpText = '';
let commandsList = [];
let delegate = null;

export const setDerived = (help, list) => {
  helpText = help;
  commandsList = list;
};

export const getHelpText = () => helpText;
export const getCommandsList = () => commandsList;

/**
 * Run another registered command by name.
 *
 * Used by alias entries ('accio' -> 'accio cv'). Routed through here rather
 * than importing the registry directly, which would be an import cycle.
 */
export const setDelegate = (fn) => { delegate = fn; };
export const runNamed = (name, ctx) => {
  if (!delegate) {
    console.error(`Command delegation used before the registry was ready: "${name}"`);
    return null;
  }
  return delegate(name, ctx);
};

/**
 * Look up a command's own metadata (name, description, category, usage,
 * aliases) by name.
 *
 * `man` renders a manual page straight from the Command objects, so it needs
 * to read the registry — which imports the command modules, so it cannot be
 * imported back. Same indirection as `delegate` above: the registry installs
 * the lookup once at startup.
 */
let metaLookup = null;
export const setMetaLookup = (fn) => { metaLookup = fn; };
export const lookupCommandMeta = (name) => {
  if (!metaLookup) {
    console.error(`Command metadata requested before the registry was ready: "${name}"`);
    return null;
  }
  return metaLookup(name);
};
