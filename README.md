# Teo Clerici - Interactive Developer Portfolio

Welcome to my interactive developer portfolio! This project deviates from a standard scrolling webpage by offering an immersive, retro-futuristic experience built around a command-line interface and a live WebGL background.

## 🌟 Key Features

### 💻 Interactive Terminal Interface
A fully functional web-based terminal that serves as the primary navigation and information hub.
- **Commands**: Type `help` to explore my background, education, skills, and projects.
- **Auto-Complete**: Press **[TAB]** for command auto-completion.
- **History Navigation**: Use **[Up/Down Arrows]** to cycle through previously entered commands.
- **Typewriter Effect**: Output animates character-by-character; click anywhere to skip.
- **Liquid Glass Shell**: Glassmorphism panel with SVG turbulence distortion and CRT scanlines.
- **3D Tilt**: The terminal responds to mouse movement with a perspective tilt effect.

### 🏓 Hidden Easter Egg
Type `game` in the terminal to launch a Pong mini-game — playable with arrow keys on desktop or touch/drag on mobile. First to 5 points wins. Ball speed increases with every hit and every round.

### 🌌 Animated WebGL Background
A custom GLSL shader rendered via Three.js draws multiple waves of glowing lines that react to your cursor in real time with a radial bend effect and parallax offset.

### 📱 Fully Responsive
- **Desktop**: Full 3D tilt, parallax, and extended ASCII art.
- **Mobile**: Touch-friendly terminal, adapted ASCII art sizes, and simplified blend modes for compatibility.

## 🛠️ Tech Stack

- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **3D / Shader**: [Three.js](https://threejs.org/) — custom WebGL shader via `ShaderMaterial` + `WebGLRenderer`
- **Styling**: Vanilla CSS with CSS Variables

## 🚀 Getting Started

### Prerequisites
Node.js v16+ required.

### Installation

```bash
npm install
```

### Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server at `http://localhost:5173` |
| `npm run build` | Bundle for production into `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint checks |

## 📂 Project Structure

```text
src/
├── assets/         # Static assets (background image, etc.)
├── components/
│   ├── Terminal.jsx     # Terminal UI, liquid glass, tilt effect
│   ├── FloatingLines.jsx # Three.js WebGL animated shader background
│   └── PongGame.jsx     # Hidden Pong mini-game easter egg
├── data/
│   └── cvData.js        # All CV content, ASCII art, command list
├── hooks/
│   ├── useTerminal.js   # Terminal state, command dispatcher
│   └── useTypewriter.js # Async character-by-character animation
├── App.jsx         # Root component, mobile detection
├── index.css       # Global styles, CSS variables, responsive rules
└── main.jsx        # React DOM entry point
```

## 📬 Contact & Links

- **Email**: clerici.teo5@gmail.com
- **LinkedIn**: [teo-clerici](https://linkedin.com/in/teo-clerici)
- **GitHub**: [teo-clerk](https://github.com/teo-clerk)

---
*Built with ❤️ (and a hidden Pong game) in Venice, Italy.*
