/**
 * The Command contract.
 *
 * @typedef {Object} CommandResult
 * @property {string}   [outputContent]  Raw HTML appended to the terminal history.
 * @property {boolean}  [shouldAnimate]  false renders instantly, skipping the typewriter.
 * @property {Function} [specialAction]  Side effect fired before the output is pushed.
 * @property {boolean}  [earlyReturn]    The command took over history/state itself.
 *
 * @typedef {Object} Command
 * @property {string}   name         Primary name, also the Tab-completion entry.
 * @property {string}   [aliasOf]    Set on alternate spellings; hides the row from `help`.
 * @property {string}   [description] Omit to keep the command out of `help` entirely.
 * @property {'cv'|'actions'|'terminal'|'egg'} category
 * @property {(ctx: object) => CommandResult} [run]        Exact-match commands.
 * @property {(cmd: string) => boolean}       [match]      Prefix/pattern commands.
 * @property {(cmd: string, ctx: object) => CommandResult} [runDynamic]
 *
 * A command is "documented" when it has a `description` and no `aliasOf`.
 * `helpText` and `commandsList` are both derived from these fields, so a new
 * command needs exactly one edit: add an object to the right category module.
 */
export const CATEGORY_LABELS = {
  cv: 'CV / INFO',
  actions: 'ACTIONS',
  terminal: 'TERMINAL',
  egg: 'EASTER EGGS',
};

export const CATEGORY_ORDER = ['cv', 'actions', 'terminal'];
