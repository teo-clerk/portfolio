# Teo Clerici - Interactive Developer Portfolio

Welcome to my interactive developer portfolio! This project deviates from a standard scrolling webpage by offering an immersive, retro-futuristic experience built around a command-line interface and a live WebGL background.

Live at **[teoclerici.com](https://teoclerici.com)**.

## 🌟 Key Features

### 🛰️ Orbit Front Door
A first visit opens on a landing page: a retro workstation floating above the Earth, with the name, a one-line role and four plain buttons (**Enter terminal**, **60-second summary**, **Read the CV**, **Download PDF**). Nobody has to type a command to reach the content.
- **Desktop**: a live [Three.js](https://threejs.org/) scene. Pressing **Enter** (or clicking the monitor) flies the camera into the screen while the boot log types out, and the terminal takes over. Typing `exit` flies back out.
- **Phones and modest hardware**: a still render of the same scene with a CSS zoom. No WebGL, and the 3D code is never downloaded.
- **Reduced motion / Save-Data**: the still image and an instant cut.
- `?cmd=…` links and sessions that already docked go straight to the terminal.

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
A custom GLSL shader draws multiple waves of glowing lines that react to your cursor in real time with a radial bend effect and parallax offset. It runs on a hand-rolled **raw WebGL2 pipeline** (WebGL1 fallback, one fullscreen triangle, ~5 kB gzipped, zero runtime dependencies) — it used to be Three.js, which cost 123 kB gzipped to draw the same single triangle. Three.js is back only for the orbit scene, where it draws an actual 3D scene, in a chunk that loads after first paint on capable desktops and nowhere else. **Performance optimized** with lazy loading, adaptive resolution, context-loss recovery and device-aware quality scaling.

### 📱 Performance & Compatibility
- **Vercel Integration**: Optimized with **Vercel Analytics** and **Speed Insights**.
- **Lazy Loading**: The WebGL background and heavy mini-games are deferred until needed, ensuring a lightning-fast First Contentful Paint. The critical path is ~104 kB of gzipped JS; the orbit scene adds ~138 kB (three + scene) and a 343 kB Earth texture on capable desktops only, after first paint.
- **Responsive**: Adapts ASCII art, blend modes, and interaction models for mobile vs. desktop transparency.

## 🛠️ Tech Stack

- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Background shader**: Raw WebGL2 (GLSL ES 1.00 source, WebGL1 fallback), no runtime dependency
- **Orbit scene**: [Three.js](https://threejs.org/), plain (no React Three Fiber), lazy-loaded; Earth texture is NASA's Blue Marble (public domain)
- **Tests**: [Vitest](https://vitest.dev/)
- **Analytics**: Vercel Analytics & Speed Insights
- **AI**: Grok/Custom API integration
- **Styling**: Vanilla CSS with CSS Variables

## 🚀 Getting Started

### Prerequisites
Node.js 22.12 or newer.

### Installation

```bash
npm install
```

### Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Run every gate (`check:vercel`, tests, `/cv` page, API load check), then bundle for production |
| `npm run preview` | Preview production build (does not apply `vercel.json` headers) |
| `npm run lint` | ESLint, kept at zero problems |
| `npm test` | Vitest unit tests |
| `npm run check:vercel` | Compile every `vercel.json` route pattern the way Vercel does |

The landing's still images and the social card are renders of the real scene. After changing anything visible in `src/intro/orbitScene.js`, regenerate them with `node scripts/render-poster.mjs` (see the header of that file for what it needs).

## 📂 Project Structure

```text
src/
├── intro/                # Orbit front door
│   ├── Landing.jsx       # The landing page (HTML) and the dock sequence
│   ├── orbitScene.js     # Three.js scene; the only file that imports three
│   ├── useOrbitScene.js  # Loads the scene after first paint, owns its lifecycle
│   ├── introState.js     # Pure decisions (show landing? which mode? poster zoom)
│   └── assets/           # Posters rendered from the scene, Earth texture
├── commands/             # Command registry: one module per category
├── components/
│   ├── Terminal.jsx      # Terminal UI
│   ├── FloatingLines.jsx # WebGL2 shader background (lazy loaded)
│   └── PongGame.jsx      # Hidden game
├── data/
│   ├── cvData.js         # CV content, ASCII art
│   └── randomArt.js      # ASCII art pool
├── hooks/
│   ├── useTerminal.js    # Command engine & sound dispatcher
│   └── useTypewriter.js  # Text animation engine
├── services/             # AI (`ask`) and weather
├── utils/                # escapeHtml, calc parser, themes, device tier, storage
└── App.jsx               # Orbit ↔ terminal switching, background, analytics
api/ask.js                # Serverless proxy for the AI assistant
scripts/                  # Build gates, /cv page generator, poster renderer
tests/                    # Vitest
```

## 📬 Contact & Links

- **Email**: clerici.teo5@gmail.com
- **LinkedIn**: [teo-clerici](https://linkedin.com/in/teo-clerici)
- **GitHub**: [teo-clerk](https://github.com/teo-clerk)

---
*Built with ❤️ in Venice, Italy.*
