/**
 * Terminal utilities, toys and system-flavoured commands.
 *
 * Each entry is a self-describing Command (see ./types.js). The registry
 * derives `commandsList` (Tab-completion, the `commands` listing) and
 * `helpText` from these objects, so adding a command here is the only edit
 * needed — there is no parallel list to keep in sync.
 */
import {
  getRandomFortune,
  themeText,
  teofetchText,
  htopText
} from '../data/cvData';
import { getHelpText, getCommandsList } from './derived';
import { abortActiveAsk } from '../services/aiService';
import { getRandomArt } from '../data/randomArt';

export const terminalCommands = [
  {
    name: "clear",
    description: "Clear the terminal",
    category: "terminal",
    run: (ctx) => {
        // A streaming `ask` writes into a history entry by id. Clearing removes
        // that entry, so the stream must be cancelled or it keeps patching a
        // row that no longer exists (and keeps the request billing).
        abortActiveAsk();
        ctx.setHistory([]);
        ctx.setInputVal('');
        ctx.setIsTyping(false);
        return { earlyReturn: true };
    },
  },
  {
    name: "help",
    description: "Show this help",
    category: "terminal",
    run: () => ({ outputContent: getHelpText() }),
  },
  {
    name: "game",
    description: "Play Pong 🏓",
    category: "terminal",
    run: (ctx) => {
        ctx.setHistory([...ctx.newHistory]);
        ctx.setInputVal('');
        setTimeout(() => ctx.setShowGame(true), 50);
        return { earlyReturn: true };
    },
  },
  {
    name: "matrix",
    description: "Enter the Matrix 🕶️",
    category: "terminal",
    run: (ctx) => {
        ctx.setHistory([...ctx.newHistory]);
        ctx.setInputVal('');
        setTimeout(() => ctx.setShowMatrix(true), 50);
        return { earlyReturn: true };
    },
  },
  {
    name: "doom",
    description: "Play DOOM classic",
    category: "terminal",
    run: (ctx) => {
        ctx.setHistory([...ctx.newHistory]);
        ctx.setInputVal('');
        setTimeout(() => ctx.setShowDoom(true), 50);
        return { earlyReturn: true };
    },
  },
  {
    name: "fortune",
    description: "Random inspirational quote",
    category: "terminal",
    run: () => ({ outputContent: getRandomFortune(), shouldAnimate: false }),
  },
  {
    name: "theme",
    description: "Switch color theme (purple/green/amber)",
    category: "terminal",
    run: () => ({ outputContent: themeText, shouldAnimate: false }),
  },
  {
    name: "ls",
    description: "List directory contents",
    category: "terminal",
    run: () => ({ outputContent: `<div class="ascii-art" style="font-size:0.85rem;">drwxr-xr-x  about/\ndrwxr-xr-x  education/\ndrwxr-xr-x  experience/\ndrwxr-xr-x  projects/\ndrwxr-xr-x  skills/\ndrwxr-xr-x  contact/\n-rw-r--r--  CV.pdf\n-rwxr-xr-x  game*</div><br>`, shouldAnimate: false }),
  },
  {
    name: "randomart",
    description: "Random ASCII art from the vault",
    category: "terminal",
    run: () => ({ outputContent: getRandomArt(), shouldAnimate: false }),
  },
  {
    name: "teofetch",
    description: "System info script",
    category: "terminal",
    run: () => ({ outputContent: teofetchText, shouldAnimate: false }),
  },
  {
    name: "htop",
    description: "Task manager",
    category: "terminal",
    run: () => ({ outputContent: htopText, shouldAnimate: false }),
  },
  {
    name: "lofi",
    description: "Toggle lofi radio 📻",
    category: "terminal",
    run: (ctx) => {
        const isPlaying = ctx.toggleLoopingSound('lofi.mp3');
        return { outputContent: `<div>🎧 Lofi Hip Hop Radio - ${isPlaying ? '<span style="color:#0f0;">PLAYING</span>' : '<span style="color:#f00;">STOPPED</span>'}</div><br>`, shouldAnimate: false };
    },
  },
  {
    name: "rain",
    description: "Toggle rain ambience 🌧️",
    category: "terminal",
    run: (ctx) => {
        const isPlaying = ctx.toggleLoopingSound('rain.mp3');
        return { outputContent: `<div>🌧️ Rain Simulator - ${isPlaying ? '<span style="color:#0f0;">PLAYING</span>' : '<span style="color:#f00;">STOPPED</span>'}</div><br>`, shouldAnimate: false };
    },
  },
  {
    name: "snake",
    description: "Play Snake 🐍",
    category: "terminal",
    run: (ctx) => {
        ctx.setHistory([...ctx.newHistory]);
        ctx.setInputVal('');
        setTimeout(() => ctx.setShowSnake(true), 50);
        return { earlyReturn: true };
    },
  },
  {
    name: "history",
    description: "View command history",
    category: "terminal",
    run: (ctx) => {
        const histLines = ctx.commandHistory.map((c, i) => `  ${i + 1}  ${c}`).join('<br>');
        return { outputContent: `<div>${histLines || 'No history yet.'}</div><br>`, shouldAnimate: false };
    },
  },
  {
    name: "map",
    description: "Show interactive map 🗺️",
    category: "terminal",
    run: () => ({
        outputContent: `
<div style="width: 100%; height: 300px; border-radius: 8px; overflow: hidden; margin-top: 10px; box-shadow: 0 0 15px var(--accent-color);">
  <iframe width="100%" height="100%" frameborder="0" scrolling="no" marginheight="0" marginwidth="0" src="https://www.openstreetmap.org/export/embed.html?bbox=12.40%2C45.56%2C12.43%2C45.59&amp;layer=mapnik&amp;marker=45.5786%2C12.4172" style="background:#000; filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%);"></iframe>
</div>
<br><div style="color:#aaa;">Location: H-Farm Campus (Roncade, Italy) 🌍</div><br>`, shouldAnimate: false
    }),
  },
  {
    name: "tour",
    description: "Take an automated tour",
    category: "terminal",
    run: (ctx) => {
        ctx.setTourQueue(['whoami', 'experience', 'skills', 'projects', 'randomart']);
        return { 
            outputContent: `<div style="color:var(--accent-color);">Starting automated tour... 🎢 Keep your hands inside the vehicle!</div><br>`, 
            shouldAnimate: true
        };
    },
  },
  {
    name: "commands",
    description: "List every registered command",
    category: "terminal",
    run: () => {
        const sortedCmds = [...getCommandsList()].sort();
        const content = `
<div class="help-container">
  <div class="section-title">ALL INTERNAL COMMANDS (DEBUG)</div>
  <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; margin-top: 10px;">
    ${sortedCmds.map(c => `<div class="command-highlight" style="font-size:0.85rem;" data-cmd="${c}">${c}</div>`).join('')}
  </div>
</div><br>`;
        return { outputContent: content, shouldAnimate: false };
    },
  },
];
