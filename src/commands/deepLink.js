/**
 * Deep links: `https://teoclerici.com/?cmd=recruiter` runs a command on arrival.
 *
 * A link is something a third party writes and a visitor merely clicks, so the
 * command it carries is untrusted input. Before this allow-list existed, any
 * command ran: `?cmd=ask <text>` fired a billed AI request with attacker-chosen
 * text, `?cmd=email` opened the visitor's mail client, and `?cmd=theme …` wrote
 * to their localStorage.
 *
 * Only commands that do nothing but print CV content are allowed, plus a short
 * list of navigation commands. Pattern commands (`ask`, `open`, `theme`,
 * `weather`, …) take free-text arguments and are never allowed.
 */
import { registry } from './registry';

/** Longest `?cmd=` value considered at all. Guards against a junk-stuffed URL. */
export const MAX_DEEP_LINK_LENGTH = 64;

/** Non-CV commands that are still safe to run unprompted. */
const EXTRA_ALLOWED = new Set(['help', 'tour', 'recruiter']);

/**
 * @param {unknown} raw The raw `cmd` query parameter.
 * @returns {string | null} The normalised command to run, or null to ignore the link.
 */
export const resolveDeepLink = (raw) => {
  if (typeof raw !== 'string') return null;

  const cmd = raw.trim().toLowerCase();
  if (!cmd || cmd.length > MAX_DEEP_LINK_LENGTH) return null;

  // Exact registry entries only: this is what excludes every pattern command.
  const command = registry.get(cmd);
  if (!command) return null;

  return command.category === 'cv' || EXTRA_ALLOWED.has(command.name) ? cmd : null;
};
