/**
 * Horizontally scrolling quick-command row.
 *
 * Tab-completion is desktop-only, so on a touch device there was no way to
 * discover what the terminal accepts short of typing `help` — which a visitor
 * has to already know to do. This surfaces the highest-value commands where
 * they are visible and tappable.
 *
 * Rendered only on coarse pointers (see index.css).
 */
const CHIPS = [
  { cmd: 'recruiter', label: '⚡ recruiter' },
  { cmd: 'about', label: 'about' },
  { cmd: 'experience', label: 'experience' },
  { cmd: 'projects', label: 'projects' },
  { cmd: 'skills', label: 'skills' },
  { cmd: 'contact', label: 'contact' },
  { cmd: 'cv', label: 'plain CV' },
  { cmd: 'tour', label: '🎢 tour' },
  { cmd: 'help', label: 'help' },
];

const CommandChips = ({ onRun, disabled }) => (
  <div className="command-chips" role="group" aria-label="Quick commands">
    <ul className="command-chips__list">
      {CHIPS.map(({ cmd, label }) => (
        <li key={cmd}>
          <button
            type="button"
            className="command-chip"
            disabled={disabled}
            onClick={() => onRun(cmd)}
            aria-label={`Run command: ${cmd}`}
          >
            {label}
          </button>
        </li>
      ))}
    </ul>
  </div>
);

export default CommandChips;
