# Teo Clerici - Interactive Developer Portfolio

Welcome to my interactive developer portfolio! This project deviates from a standard scrolling webpage by offering an immersive, retro-futuristic experience built around a command-line interface and a live WebGL background.

## 🌟 Key Features

### 💻 Interactive Terminal Interface
A fully functional web-based terminal that serves as the primary navigation and information hub.
- **Commands**: Type `help` to explore my background, education, skills, and projects.
- **AI Chat**: Use `ask [question]` to interact with an AI model trained on my profile.
- **Utilities**: Integrated `calc [math]`, `history`, `weather`, and `volume` controls.
- **Auto-Complete**: Press **[TAB]** for command auto-completion.
- **History Navigation**: Use **[Up/Down Arrows]** to cycle through previously entered commands.
- **Liquid Glass Shell**: Glassmorphism panel with SVG turbulence distortion and CRT scanlines.

### 🎭 Easter Eggs & Multimedia
The terminal hides numerous immersive experiences:
- **Gaming**: Type `game` to launch a Pong mini-game.
- **Cinematic Art**: Commands like `gargantua`, `vader`, `groot`, and `spiderman` trigger unique ASCII art, CSS effects (like gravitational lensing), and synchronized sound effects.
- **Audio System**: Custom sound manager handling effects (`mp3`) and looping lofi/rain tracks, all respecting a global `volume` command.
- **Matrix Mode**: Type `matrix` to activate a rain overlay.

### 🌌 Animated WebGL Background
A custom GLSL shader rendered via Three.js draws multiple waves of glowing lines that react to your cursor in real time with a radial bend effect and parallax offset. **Performance optimized** with lazy loading and device-aware quality scaling.

### 📱 Performance & Compatibility
- **Vercel Integration**: Optimized with **Vercel Analytics** and **Speed Insights**.
- **Lazy Loading**: Three.js and heavy mini-games are deferred until needed, ensuring a lightning-fast First Contentful Paint.
- **Responsive**: Adapts ASCII art, blend modes, and interaction models for mobile vs. desktop transparency.

## 🛠️ Tech Stack

- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **3D / Shader**: [Three.js](https://threejs.org/) — custom WebGL shader via `ShaderMaterial`
- **Analytics**: Vercel Analytics & Speed Insights
- **AI**: Grok/Custom API integration
- **Styling**: Vanilla CSS with CSS Variables

## 🚀 Getting Started

### Prerequisites
Node.js v18+ required.

### Installation

```bash
npm install
```

### Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Bundle for production (with manual chunk splitting) |
| `npm run preview` | Preview production build |

## 📂 Project Structure

```text
src/
├── components/
│   ├── Terminal.jsx      # Terminal UI & command logic
│   ├── FloatingLines.jsx # 3D Shader background (Lazy loaded)
│   └── PongGame.jsx      # Hidden game (Lazy loaded)
├── data/
│   ├── cvData.js         # Text content, ASCII art & palettes
│   └── randomArt.js      # Expanded ASCII art vault
├── hooks/
│   ├── useTerminal.js    # Core command engine & sound dispatcher
│   └── useTypewriter.js  # Text animation engine
├── services/
│   └── aiService.js      # Grok/AI API integration
└── App.jsx               # Entry point, theme provider & analytics
```

## 📬 Contact & Links

- **Email**: clerici.teo5@gmail.com
- **LinkedIn**: [teo-clerici](https://linkedin.com/in/teo-clerici)
- **GitHub**: [teo-clerk](https://github.com/teo-clerk)

---
*Built with ❤️ in Venice, Italy.*
