# Interactive Terminal Portfolio - Developer & AI Context

## Overview

This is an interactive, terminal-based portfolio website for Teo Clerici, an AI & Data Science student. It simulates a Unix-like terminal environment with a modern, glassmorphic 3D aesthetic. Users interact with the portfolio solely using terminal commands to view experience, education, projects, and trigger various interactive easter eggs or APIs (weather, AI chatting, Spotify lofi).

## Tech Stack

- **Framework:** React 19 + Vite
- **Styling:** Vanilla CSS variables and glassmorphism techniques.
- **3D Graphics:** \`@react-three/fiber\` & \`@react-three/drei\` (Three.js abstraction) for background WebGL shaders and effects.
- **Analytics:** Vercel Analytics and Speed Insights.
- **AI Integration:** Communication with Grok API for the \`ask\` command.

## Project Structure

- \`/src/main.jsx\`: Application entry point.
- \`/src/App.jsx\`: Main layout containing the 3D canvas (WebGL) and the terminal GUI overlay.
- \`/src/components/\`: React components for individual UI elements (Terminal, FloatingLines, PongGame, etc.).
- \`/src/hooks/\`:
  - \`useTerminal.js\`: **The core logic module.** Handles command parsing, history traversal (up/down arrows), easter egg triggers, state management of the terminal output, theme switching, and async API calls.
  - \`useTypewriter.js\`: Hook to animate text simulating typing behavior.
- \`/src/data/\`:
  - \`cvData.js\`: Contains all static text constants, help menus, ASCII art, easter egg definitions, and the \`commandsList\` array which registers valid commands.
  - \`randomArt.js\`: An array pool of high-quality ASCII art.
- \`/src/services/\`:
  - \`aiService.js\`: API integration layer for communicating with the Grok AI model.
- \`/public/\`: Static assets, including \`/sounds/\` used for interactive command feedback (e.g., Groot, Star Wars audio).

## Core Mechanics

1. **Command Processing**: Every string entered in the terminal input box is processed by \`runCommand()\` in \`useTerminal.js\`.
2. **Action Dispatching**: Commands can return simple HTML strings (viewed as terminal output) or trigger \`specialAction\` callbacks (like opening a PDF, switching a CSS variable theme, spawning a React component like Pong, or querying an API).
3. **Easter Eggs**: The project implements many cinematic easter eggs with CSS manipulations and audio triggers. Examples include \`matrix\`, \`spiderman\`, \`r2d2\`, \`yoda\`, and \`gargantua\`.

## Missing Commands Context

Previously, \`commandsList\` in \`cvData.js\` was incomplete, causing the hidden debug command \`commands\` to omit certain interactions. **Any new command added to \`useTerminal.js\` MUST also have its name/alias appended to \`commandsList\` in \`cvData.js\`** so that agents and users can discover it.

---

## 🚀 Potential Improvements & Extra Functionalities

The architecture is solid, but here are some thoughtful additions that could enhance the user experience and codebase maintainability:

### Terminal Auto-Completion (Tab Key)

**Concept**: Allow users to press \`Tab\` to autocomplete commands, similar to real terminals.
**Implementation**: Inside the \`handleKeyDown\` function in \`useTerminal.js\`, listen for \`e.key === 'Tab'\`, match the current \`inputVal\` against \`commandsList\`, and auto-fill it to speed up navigation.

### Interactive 'Tour' Sequence

**Concept**: For non-technical recruiters or users confused by the blank CLI interface, a \`tour\` command could automate a sequence of typing.
**Implementation**: Creating an array of commands (e.g., \`['whoami', 'experience', 'projects', 'randomart']\`) that execute themselves programmatically with delays via \`setTimeout\` to guide the user.

### Architectural: Command Pattern Refactor

**Concept**: As the list of commands grows, \`useTerminal.js\` becomes a massive \`if/else\` block.
**Implementation**: Refactor into a Command Pattern where each command is an object with an \`execute()\` function. Example:
\`\`\`javascript
const commands = {
'help': {
execute: () => ({ outputContent: helpText })
},
'theme': {
execute: (args) => { applyTheme(args[0]); return { outputContent: 'Switched theme' } }
}
}
\`\`\`
This would dramatically reduce the cognitive complexity of \`useTerminal.js\`.
