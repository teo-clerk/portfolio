export const cvData = {
    'about': `
<span class="section-title">PROFESSIONAL SUMMARY</span>
<strong>AI &amp; Data Science</strong> undergraduate (<strong>year 2 of 3</strong>) at <strong>H-FARM College</strong> (University of Chichester, UK) with a <strong>builder's mindset</strong>: I learn by building and shipping, from <strong>open-source AI tools</strong> to working <strong>hardware</strong>.
Trilingual <strong>MIT-affiliated hackathon mentor</strong> and campus-club founder, building <strong>AI for Earth observation</strong> and <strong>AI learning tools</strong>.
`,
    'floodfusion': `
<span class="section-title">FEATURED PROJECT — FLOODFUSION</span>
<span class="list-item"><strong>FloodFusion</strong> — calibrated flood maps from Sentinel-1 radar, with optional Sentinel-2 (Aug 2026 – Present)
   <br>&nbsp;&nbsp;<a href="https://github.com/teo-clerk/floodfusion" target="_blank" rel="noopener noreferrer">Repository</a> · <a href="https://github.com/teo-clerk/floodfusion/releases/tag/v1.2.0" target="_blank" rel="noopener noreferrer">release v1.2.0 (MIT)</a> · <a href="https://github.com/teo-clerk/floodfusion/blob/main/paper/paper_v12.pdf" target="_blank" rel="noopener noreferrer">11-page preprint</a> · <a href="https://teo-clerk.github.io/floodfusion/arena.html" target="_blank" rel="noopener noreferrer">Arena</a>
   <br>&nbsp;&nbsp;Stack: Python, PyTorch, TerraTorch, pystac, rasterio, xarray, Docker.</span>

<span class="list-item"><strong>Problem.</strong> Flood maps an emergency duty officer can act on: calibrated, with a mask for where not to trust them, using Sentinel-2 only where the sky is clear.</span>

<span class="list-item"><strong>Physics.</strong> Refined Lee speckle filter; slope, local incidence, shadow/layover and HAND terrain masks from Copernicus DEM; a Range–Doppler geocoder checked against ESA's geolocation tie points to 0.1 px.</span>

<span class="list-item"><strong>Model.</strong> Gated cross-attention fusion: radar always on, optical admitted per pixel by a quality gate, so a closed gate is the radar-only path. About 19 M parameters, 6 ms per 256×256 chip on a laptop RTX 4060. v1.2 adds a seasonal radar reference (same orbit, one year earlier).</span>

<span class="list-item"><strong>Data and product.</strong> Trained on Kuro Siwo and GEOID-Flood labels (7,006 chips, 138 floods), open data only. Threshold derived from a stated cost of misses vs false alarms, with conformal miss-rate control; output as Copernicus GFM-style COG layers plus a STAC 1.0 Item.</span>

<span class="list-item"><strong>Results</strong> (38 Copernicus EMS flood activations, 2023–2026, mapped on non-Sentinel radar; frozen models scored once; descriptive).
   <br>&nbsp;&nbsp;• <strong>IoU 0.417</strong> at its own threshold, vs 0.405 for a fairly trained TerraMind-base + LoRA (not significant) and 0.373 for the physics baseline.
   <br>&nbsp;&nbsp;• On the 34 floods the operational <strong>Copernicus GFM</strong> covers: <strong>0.419 vs 0.321</strong> (+0.098, better on 25 of 34, Holm p = 0.001).
   <br>&nbsp;&nbsp;• Forlì, May 2023 (EMSR664), zero-shot against the Copernicus EMS delineation: IoU 0.507; 28.0 km² flooded in both.</span>

<span class="list-item"><strong>Evaluation.</strong> Pre-registered protocols for v1.1 and v1.2; models frozen at a git tag, and every new eligible Copernicus EMS flood scored into a <strong>sealed, hash-chained blind-test ledger</strong> until 20 activations or end-2027. 1,099 tests, 81.9 % coverage, every report tied to a git SHA.</span>

<span class="list-item"><strong>What failed.</strong> A +0.265 IoU benchmark gain (Sen1Floods11, 0.608 vs 0.343) did not carry over to independent Copernicus maps; v1.1's win over TerraMind was a training bug, withdrawn in a <strong>published erratum</strong>; partly cloudy scenes still score lower with optical than without (0.254 vs 0.307).</span>

<span class="list-item"><strong>How it was built.</strong> With AI coding agents under my scientific direction; every paper number traces to a report.</span>
`,
    'education': `
<span class="section-title">EDUCATION</span>
<span class="list-item"><strong>BSc (Hons) AI &amp; Data Science</strong>, year 2 of 3 (Sep 2025 – Expected May 2028)
   H-FARM College, Venice, Italy — degree awarded by the University of Chichester (UK)
   <br>&nbsp;&nbsp;• Year 1: <strong>77.8 % average</strong> (First-class standard), <strong>grade A in all six modules</strong>, incl. Algorithms &amp; Data Structures 84, Linear Algebra 81, Programming 80, Probability 77.
   <br>&nbsp;&nbsp;• Year 2 (2026/27): Fundamentals of Statistics, Databases, Software Engineering, Introduction to Machine Learning.
   <br>&nbsp;&nbsp;• Founder of the H-Altura Club and Student Ambassador on campus.</span>

<span class="list-item"><strong>Technology Baccalaureate, Engineering &amp; Technology</strong> (Sep 2023 – Jun 2025)
   CIC Escola Batxillerats (Barcelona, Spain) | Grade: 8.29/10
   <br>&nbsp;&nbsp;• Technology and engineering specialization with strong STEM foundation.
   <br>&nbsp;&nbsp;• MIT &amp; CIC Hackathon participant (2024), then mentor (2025).</span>
`,
    'experience': `
<span class="section-title">PROFESSIONAL EXPERIENCE</span>
<span class="list-item"><strong>Student Host &amp; Moderator, ESA &ldquo;Space Isn't the Limit&rdquo;</strong> @ H-FARM Campus, Venice (Oct 2026)
   <br>&nbsp;&nbsp;• Official student host of an ESA event: opened it, introduced six speakers, four from ESA (incl. the <strong>Heads of the AI &amp; Data Science, Structures and Innovation Services sections</strong>), and moderated the student Q&amp;A.</span>

<span class="list-item"><strong>Q&amp;A Moderator, Futurist Session with Toshi Anders Hoo</strong> @ H-FARM Campus, Venice (Sep 2026)
   <br>&nbsp;&nbsp;• Moderated a 30-minute live Q&amp;A, turning emerging-technology and foresight themes into sharp, accessible questions.</span>

<span class="list-item"><strong>Brand Ambassador &amp; Content Creator</strong> @ Audi We Generation — Audi Italia (May 2026 – Present)
   <br>&nbsp;&nbsp;• Selected as <strong>1 of 5</strong> representatives from <strong>1,300+ applicants</strong> for the 9th edition of this Audi × H-FARM programme.
   <br>&nbsp;&nbsp;• Produce digital content and lead public discussions on innovation, technology, sustainability and the future of mobility.</span>

<span class="list-item"><strong>Student Ambassador</strong> @ H-FARM College — Venice, Italy (Nov 2025 – Present)</span>

<span class="list-item"><strong>Junior Consultant</strong> @ Lumina Consulting Agency — Venice, Italy (Oct 2025 – Present)
   <br>&nbsp;&nbsp;• Research-driven advisory for a student-led consultancy: business strategy, media &amp; communication, AI &amp; digital.</span>

<span class="list-item"><strong>Educational Mentor</strong> @ MIT Edgerton Center &amp; Fundació CIC (Jan 2025 – Present)
   <br>&nbsp;&nbsp;• Part of the <strong>MIT BCN Squad</strong>, running engineering design workshops worldwide.
   <br>&nbsp;&nbsp;• Mentored teams from first idea to working prototype at <strong>MIT × CIC × UPC</strong> (Jan 2025), <strong>BCN Tech Projects × UPC</strong> (Aug 2025) and <strong>International Hackathon Mexico</strong> (Oct 2025, remote).
   <br>&nbsp;&nbsp;• CIC TechProjects 2025: taught the engineering process to a 12th-grade class.</span>

<span class="list-item"><strong>Private Tutor – Programming &amp; Mathematics</strong> @ Self-Employed, Barcelona (Sep 2022 – Jun 2024)
   <br>&nbsp;&nbsp;• One-on-one support in Python, C++ and Mathematics for secondary school students.</span>

<span class="list-item"><strong>Environmental Research Participant</strong> @ Congress of Catalunya (Jun 2021 – Aug 2024)
   <br>&nbsp;&nbsp;• Research camps focused on bird migration and ecosystem monitoring.</span>
`,
    'projects': `
<span class="section-title">PROJECTS &amp; INITIATIVES</span>
<span class="list-item"><strong>FloodFusion</strong> — calibrated flood maps from Sentinel-1 radar, with optional Sentinel-2 (Aug 2026 – Present) — <a href="https://github.com/teo-clerk/floodfusion" target="_blank" rel="noopener noreferrer">github.com/teo-clerk/floodfusion</a>
   <br>&nbsp;&nbsp;• Radar physics (speckle filter, terrain masks) plus a SAR–optical model; output as Copernicus GFM-style COG layers and a STAC item.
   <br>&nbsp;&nbsp;• On the 34 Copernicus EMS floods the operational Copernicus GFM covers: <strong>0.419 vs 0.321 IoU</strong> (+0.098, better on 25 of 34). Descriptive result; a pre-registered blind test is running.
   <br>&nbsp;&nbsp;• <strong>1,099 tests</strong>, two published errata; <strong>v1.2.0</strong> public under the MIT licence with an 11-page preprint.
   <br>&nbsp;&nbsp;• Stack: Python, PyTorch, TerraTorch, pystac, rasterio, xarray, Docker. Method, results and what failed: <span class="command-highlight" data-cmd="floodfusion">floodfusion</span></span>

<span class="list-item"><strong>MDlearn</strong> — turns class files or a topic into compiler-checked, spaced-repetition courses (Oct 2026 – Present) — <a href="https://github.com/teo-clerk/MDlearn" target="_blank" rel="noopener noreferrer">github.com/teo-clerk/MDlearn</a>
   <br>&nbsp;&nbsp;• Add PDFs, slides, code or just a topic: an AI writes courses with worked examples and exercises, a strict Markdown compiler checks them, and FSRS spaced repetition schedules review. Local-first: no account, no analytics.
   <br>&nbsp;&nbsp;• Ships on <strong>npm</strong> (<code>npx mdlearn studio</code>) and as <strong>desktop apps for Windows, macOS and Linux</strong>; a 15-tool MCP server lets AI assistants tutor from a course; interface in 5 languages.
   <br>&nbsp;&nbsp;• <strong>v1.8.0</strong>, MIT licence. Stack: TypeScript, Node.js, React 19, Vite, Hono, Electron, Vitest, Playwright.</span>

<span class="list-item"><strong>SciNet</strong> — open-source 3D map of a scientific PDF library (2026 – Present) — <a href="https://github.com/teo-clerk/SciNet" target="_blank" rel="noopener noreferrer">github.com/teo-clerk/SciNet</a>
   <br>&nbsp;&nbsp;• Turns a folder of scientific PDFs into a 3D map you can explore by topic: OCR, embeddings, UMAP/HDBSCAN clustering and plain-language names for each region.
   <br>&nbsp;&nbsp;• Runs on one <strong>8 GB laptop GPU</strong> with no cloud calls by default; tested on a <strong>506-paper</strong> library.
   <br>&nbsp;&nbsp;• Search by meaning or exact phrase, filters on measured quantities in 18 SI units, and an MCP server so AI coding assistants can read the library.
   <br>&nbsp;&nbsp;• <strong>v0.1.0</strong>, MIT licence. Stack: Python, FastAPI, SQLite, Ollama, React.</span>

<span class="list-item"><strong>La Casita (LaCasitaOS)</strong> — co-living OS for student households (2026 – Present) — <a href="https://lacasitaos.app/" target="_blank" rel="noopener noreferrer">lacasitaos.app</a>
   <br>&nbsp;&nbsp;• Receipt OCR, item-level weighted splits through a swipe UI and min-cash-flow debt simplification across <strong>7 modules</strong>.
   <br>&nbsp;&nbsp;• Stripe billing, push notifications and an Android app in Google Play testing; written monetization plan.
   <br>&nbsp;&nbsp;• Stack: Next.js 16, React 19, TypeScript, Prisma, Supabase/PostgreSQL, Stripe.</span>

<span class="list-item"><strong>DIY Xenon Plasma Toroid</strong> — Independent High-Voltage Hardware Build
   <br>&nbsp;&nbsp;• Designed and built a working xenon plasma toroid: high-voltage drive electronics and gas-discharge apparatus.</span>

<span class="list-item"><strong>PiLearn</strong> — piano-learning assistant (2026 – Present, in development)
   <br>&nbsp;&nbsp;• Upload sheet music, get a step-by-step practice plan: PDF → optical music recognition → MusicXML/MIDI.
   <br>&nbsp;&nbsp;• Java / Spring Boot API, Angular frontend and a Python worker, run with Docker Compose.</span>

<span class="list-item"><strong>ArTeo</strong> — personal portfolio and art gallery (2026 – Present) — <a href="https://arteo.teoclerici.com" target="_blank" rel="noopener noreferrer">arteo.teoclerici.com</a>
   <br>&nbsp;&nbsp;• Vision-model descriptions, trilingual stories and generated music per artwork, a 3D viewer and account-free checkout.
   <br>&nbsp;&nbsp;• Stack: Next.js, Prisma/Supabase, Stripe.</span>

<span class="list-item"><strong>Interactive Terminal Portfolio</strong> — <a href="https://github.com/teo-clerk" target="_blank" rel="noopener noreferrer">github.com/teo-clerk</a>
   <br>&nbsp;&nbsp;• The very site you're exploring right now.
   <br>&nbsp;&nbsp;• Built with <strong>React 19</strong>: a <strong>Three.js</strong> orbit scene as the front door (lazy-loaded, desktop only), hand-written <strong>WebGL2 GLSL shaders</strong> behind the terminal, glassmorphism UI.
   <br>&nbsp;&nbsp;• Features: streaming AI assistant, typewriter animations, mini-games, hidden easter eggs, theme switching.</span>

<span class="list-item"><strong>H-Altura Club</strong> (Founder &amp; Coordinator) @ H-FARM Campus (2025 – Present) — <a href="https://www.instagram.com/haltura.club/" target="_blank" rel="noopener noreferrer">@haltura.club</a>
   <br>&nbsp;&nbsp;• Founded and run the campus outdoor-activities club.
   <br>&nbsp;&nbsp;• <strong>100+ participants</strong> across community-building events.</span>
`,
    'skills': `
<span class="section-title">SKILLS</span>
<span class="list-item"><strong>Technical:</strong>
   <br>&nbsp;&nbsp;• Earth Observation: Sentinel-1 SAR, Sentinel-2, Copernicus DEM, EMS &amp; GFM, STAC/COG, pystac, rasterio, xarray, GeoPandas
   <br>&nbsp;&nbsp;• Machine Learning: PyTorch, TerraTorch (TerraMind + LoRA), segmentation, calibration, conformal prediction, model evaluation
   <br>&nbsp;&nbsp;• Applied AI: local LLMs via Ollama, Claude Agent SDK, embeddings, UMAP/HDBSCAN, OCR (Marker, Surya), MCP servers
   <br>&nbsp;&nbsp;• Software: Python (FastAPI, uv, pytest), Docker, GitHub Actions CI, SQLite, Linux (Arch/Hyprland), Git/GitHub
   <br>&nbsp;&nbsp;• Web &amp; Product: TypeScript, React/Next.js, Node.js, Electron, Vitest/Playwright, Prisma, PostgreSQL/Supabase, Stripe
   <br>&nbsp;&nbsp;• Other Languages: C/C++ (Arduino), Java (Spring Boot), SQL, Bash, LaTeX
   <br>&nbsp;&nbsp;• Hardware: high-voltage electronics, Fusion 360, 3D printing
   <br>&nbsp;&nbsp;• Creative Technical: Photography, Astrophotography, Video Editing, Drone Piloting</span>

<span class="list-item"><strong>Communication, Leadership &amp; Organization:</strong>
   <br>&nbsp;&nbsp;• Multilingual: Spanish, Italian, Catalan (Native) · English (B2) · French (A2)
   <br>&nbsp;&nbsp;• Public Speaking, Mentoring, Team Collaboration, Event Coordination, Project Management</span>
`,
    'certifications': `
<span class="section-title">CERTIFICATIONS</span>
<span class="list-item"><strong>Business Intelligence and Data Analytics with Enterprise Tools (Power BI)</strong> — Microsoft (2025)</span>
<span class="list-item"><strong>Bojos per la Ciència: Inteligencia Artificial</strong> — Fundació Catalunya La Pedrera (Nov 2024)</span>
<span class="list-item"><strong>MIT &amp; CIC &amp; UPC Hackathon Participation</strong> — MIT Edgerton Center (Jan 2024)</span>
<span class="list-item"><strong>English Language Certification (Level B2)</strong> — Cambridge (Jul 2023)</span>
<span class="list-item"><strong>C++ Programming – Competitive Programming</strong> — Olimpiada Informática Española (Jun 2022)</span>
`,
    'publications': `
<span class="section-title">PUBLICATIONS</span>
<span class="list-item"><strong>Labels, Thresholds and a Blind Test: Evaluating Sentinel-1 Flood Segmentation Against Independent Copernicus EMS Maps</strong> — T. Clerici Jurado, preprint, 11 pp., Oct 2026 (not peer reviewed) — <a href="https://github.com/teo-clerk/floodfusion/blob/main/paper/paper_v12.pdf" target="_blank" rel="noopener noreferrer">PDF</a>
   <br>&nbsp;&nbsp;• The FloodFusion v1.2 technical paper, with a one-page extended abstract.</span>
`,
    'awards': `
<span class="section-title">AWARDS &amp; COMPETITIONS</span>
<span class="list-item"><strong>1st place (team)</strong> — EssilorLuxottica × Forbes Next Leaders Business Game (Sep 2026)
   <br>&nbsp;&nbsp;• Managerial and financial decision-making case: 53 points vs 47 for the runner-up.</span>
<span class="list-item"><strong>Selected 1 of 5 from 1,300+ applicants</strong> — Audi We Generation, 9th edition (May 2026)</span>
`,
    'languages': `
<span class="section-title">LANGUAGES</span>
<span class="list-item"><strong>Spanish:</strong> Native</span>
<span class="list-item"><strong>Italian:</strong> Native</span>
<span class="list-item"><strong>Catalan:</strong> Native</span>
<span class="list-item"><strong>English:</strong> B2 (Upper Intermediate)</span>
<span class="list-item"><strong>French:</strong> A2 (Elementary)</span>
`,
    'interests': `
<span class="section-title">INTERESTS</span>
AI &amp; Machine Learning, Astrophysics, High-Altitude Hiking, Astrophotography, High-Voltage Electronics, Educational Technology, Startup Ecosystem.
`,
    'contact': `
<span class="section-title">CONTACT</span>
<span class="list-item"><strong>Email:</strong> <a href="mailto:clerici.teo5@gmail.com">clerici.teo5@gmail.com</a></span>
<span class="list-item"><strong>Phone:</strong> +34 615 451 338</span>
<span class="list-item"><strong>Location:</strong> Venice, Italy</span>
<span class="list-item"><strong>LinkedIn:</strong> <a href="https://linkedin.com/in/teo-clerici" target="_blank" rel="noopener noreferrer">linkedin.com/in/teo-clerici</a></span>
<span class="list-item"><strong>GitHub:</strong> <a href="https://github.com/teo-clerk" target="_blank" rel="noopener noreferrer">github.com/teo-clerk</a></span>
`
};

// Random ASCII art lives in ./randomArt.js.
// helpText now lives in src/commands/registry.js, derived from the command
// modules themselves so it can never drift from what is actually registered.
export const whoamiText = `
<div class="whoami-card">
  <div class="whoami-row"><span class="whoami-label">name</span><span class="whoami-value">Teo Clerici Jurado</span></div>
  <div class="whoami-row"><span class="whoami-label">role</span><span class="whoami-value">AI &amp; Data Science Student · Builder · Mentor</span></div>
  <div class="whoami-row"><span class="whoami-label">location</span><span class="whoami-value">Venice, Italy (H-FARM College)</span></div>
  <div class="whoami-row"><span class="whoami-label">languages</span><span class="whoami-value">ES · IT · CA · EN · FR</span></div>
  <div class="whoami-row"><span class="whoami-label">stack</span><span class="whoami-value">Python · PyTorch · Sentinel-1/2 · FastAPI · TypeScript/React · Docker</span></div>
  <div class="whoami-row"><span class="whoami-label">email</span><span class="whoami-value"><a href="mailto:clerici.teo5@gmail.com">clerici.teo5@gmail.com</a></span></div>
  <div class="whoami-row"><span class="whoami-label">github</span><span class="whoami-value"><a href="https://github.com/teo-clerk" target="_blank" rel="noopener noreferrer">github.com/teo-clerk</a></span></div>
  <div class="whoami-row"><span class="whoami-label">linkedin</span><span class="whoami-value"><a href="https://linkedin.com/in/teo-clerici" target="_blank" rel="noopener noreferrer">linkedin.com/in/teo-clerici</a></span></div>
</div><br>
`;

const fortunes = [
    `"The best way to predict the future is to invent it." — Alan Kay`,
    `"Data is the new oil. But like oil, it's valuable only when refined." — Clive Humby`,
    `"Any sufficiently advanced technology is indistinguishable from magic." — Arthur C. Clarke`,
    `"The goal of education is not to increase the amount of knowledge but to create the possibilities for a child to invent and discover." — Jean Piaget`,
    `"In the middle of difficulty lies opportunity." — Albert Einstein`,
    `"Somewhere, something incredible is waiting to be known." — Carl Sagan`,
    `"The universe is under no obligation to make sense to you." — Neil deGrasse Tyson`,
    `"It always seems impossible until it is done." — Nelson Mandela`,
    `"Machine intelligence is the last invention that humanity will ever need to make." — Nick Bostrom`,
    `"Talk is cheap. Show me the code." — Linus Torvalds`,
    // Subtle HP
    `"It is our choices that show what we truly are, far more than our abilities." — A. Dumbledore`,
    `"Do not pity the dead. Pity the living, and above all, those who live without love." — A. Dumbledore`,
    `"Words are, in my not-so-humble opinion, our most inexhaustible source of magic." — A. Dumbledore`,
    // Subtle Marvel
    `"With great power comes great responsibility." — B. Parker's uncle`,
    `"Part of the journey is the end." — T. Stark`,
    `"I am Iron Man." — T. Stark (and the whole point of owning what you build)`,
];

export const getRandomFortune = () => {
    const quote = fortunes[Math.floor(Math.random() * fortunes.length)];
    return `<div style="font-style:italic; color:#ccc; border-left: 2px solid var(--accent-color); padding-left: 12px; margin: 4px 0;">${quote}</div><br>`;
};

export const themeText = `
<div>Available themes: <span class="command-highlight" data-cmd="theme purple">purple</span> &nbsp; <span class="command-highlight" data-cmd="theme green">green</span> &nbsp; <span class="command-highlight" data-cmd="theme amber">amber</span></div>
<div style="color:#888; font-size:0.85rem;">Usage: <em>theme green</em></div><br>
`;

export const asciiArtFull = `
<div class="ascii-art glitch-target">
████████╗███████╗ ██████╗      ██████╗██╗     ███████╗██████╗ ██╗ ██████╗██╗      ██╗██╗   ██╗██████╗  █████╗ ██████╗  ██████╗ 
╚══██╔══╝██╔════╝██╔═══██╗    ██╔════╝██║     ██╔════╝██╔══██╗██║██╔════╝██║      ██║██║   ██║██╔══██╗██╔══██╗██╔══██╗██╔═══██╗
   ██║   █████╗  ██║   ██║    ██║     ██║     █████╗  ██████╔╝██║██║     ██║      ██║██║   ██║██████╔╝███████║██║  ██║██║   ██║
   ██║   ██╔══╝  ██║   ██║    ██║     ██║     ██╔══╝  ██╔══██╗██║██║     ██║ ██   ██║██║   ██║██╔══██╗██╔══██║██║  ██║██║   ██║
   ██║   ███████╗╚██████╔╝    ╚██████╗███████╗███████╗██║  ██║██║╚██████╗██║ ╚█████╔╝╚██████╔╝██║  ██║██║  ██║██████╔╝╚██████╔╝
   ╚═╝   ╚══════╝ ╚═════╝      ╚═════╝╚══════╝╚══════╝╚═╝  ╚═╝╚═╝ ╚═════╝╚═╝  ╚════╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝  ╚═════╝ 
</div>
<div class="subtitle">AI &amp; Data Science Student</div>
<div>Type <span class="command-highlight" data-cmd="help">'help'</span> to see available commands.</div>
<div>Recruiters: Type <span class="command-highlight" data-cmd="recruiter">'recruiter'</span> for a quick summary or <span class="command-highlight" data-cmd="tour">'tour'</span> for an automated showcase!</div>
<br>
`;

export const asciiArt = `
<div class="ascii-art glitch-target">
████████╗███████╗ ██████╗     ██████╗██╗     ███████╗██████╗ ██╗ ██████╗██╗
╚══██╔══╝██╔════╝██╔═══██╗   ██╔════╝██║     ██╔════╝██╔══██╗██║██╔════╝██║
   ██║   █████╗  ██║   ██║   ██║     ██║     █████╗  ██████╔╝██║██║     ██║
   ██║   ██╔══╝  ██║   ██║   ██║     ██║     ██╔══╝  ██╔══██╗██║██║     ██║
   ██║   ███████╗╚██████╔╝   ╚██████╗███████╗███████╗██║  ██║██║╚██████╗██║
   ╚═╝   ╚══════╝ ╚═════╝     ╚═════╝╚══════╝╚══════╝╚═╝  ╚═╝╚═╝ ╚═════╝╚═╝
</div>
<div class="subtitle">AI &amp; Data Science Student</div>
<div>Type <span class="command-highlight" data-cmd="help">'help'</span> to see available commands.</div>
<div>Recruiters: Type <span class="command-highlight" data-cmd="recruiter">'recruiter'</span>!</div>
<br>
`;

export const asciiArtMobile = `
<div class="ascii-art glitch-target">
████████╗███████╗ ██████╗ 
╚══██╔══╝██╔════╝██╔═══██╗
   ██║   █████╗  ██║   ██║
   ██║   ██╔══╝  ██║   ██║
   ██║   ███████╗╚██████╔╝
   ╚═╝   ╚══════╝ ╚═════╝ 
</div>
<div class="subtitle">AI &amp; Data Science Student</div>
<div>Type <span class="command-highlight" data-cmd="help">'help'</span></div>
<div>Fast track? Type <span class="command-highlight" data-cmd="recruiter">'recruiter'</span></div>
<br>
`;

export const interstellarText = `
<div class="interstellar-quote">
  <div style="color: var(--accent-color); font-size:0.75rem; letter-spacing:0.15em; margin-bottom:8px;">ENDURANCE SHIP LOG — MISSION DAY 730</div>
  <div style="font-style:italic; color:#ddd; line-height:1.8;">
    &ldquo;Mankind was born on Earth. It was never meant to die here.&rdquo;
    <br><span style="color:#888;">— Cooper, Interstellar (2014)</span>
  </div>
  <br>
  <div style="color:#aaa; font-size:0.88rem;">
    There's a reason this film lives rent-free in my head. The idea that love,
    curiosity, and data can transcend space and time — that's not science fiction,
    that's the entire point of learning.
  </div>
  <br>
  <div style="color: var(--accent-color); font-size:0.8rem;">"We used to look up at the stars and wonder. Now we just look down." — Murph</div>
</div><br>
`;

export const tarsText = `
<div class="whoami-card">
  <div class="whoami-row"><span class="whoami-label">unit</span><span class="whoami-value">TARS — Tactical Anthropomorphic Robot</span></div>
  <div class="whoami-row"><span class="whoami-label">honesty</span><span class="whoami-value">90%</span></div>
  <div class="whoami-row"><span class="whoami-label">humor</span><span class="whoami-value">75% (adjustable)</span></div>
  <div class="whoami-row"><span class="whoami-label">status</span><span class="whoami-value">Operational. Awaiting mission parameters.</span></div>
  <div class="whoami-row"><span class="whoami-label">note</span><span class="whoami-value">This terminal is not TARS. But it admires him.</span></div>
</div><br>
`;

export const accioText = `<div>📖 <em>Accio CV...</em></div><div style="color:#aaa;">Summoning Teo_Clerici_CV.pdf from the restricted section... <em>Wingardium Leviosa!</em> It floats toward you.</div><br>`;

export const avengersText = `
<div class="whoami-card">
  <div style="color:var(--accent-color); letter-spacing:0.1em; margin-bottom:8px;">A V E N G E R S   A S S E M B L E</div>
  <div class="whoami-row"><span class="whoami-label">iron man</span><span class="whoami-value">genius, billionaire, data scientist (?)</span></div>
  <div class="whoami-row"><span class="whoami-label">cap</span><span class="whoami-value">I can do this all day — so can a for loop</span></div>
  <div class="whoami-row"><span class="whoami-label">tars</span><span class="whoami-value">already on the team — see: <span class="command-highlight" data-cmd="tars">tars</span></span></div>
  <div class="whoami-row"><span class="whoami-label">status</span><span class="whoami-value">Endgame: graduate, build things, change things.</span></div>
</div><br>
`;

export const expectoText = `
<div style="font-style:italic; color:#ccc;">🧙 <em>Expecto Patronum!</em></div>
<pre class="ascii-art" style="color:#aaa; font-size:0.8rem; margin-top:8px;">
       /\\
      /  \\      *   *
     / /\\ \\   *  * * *
    / /  \\ \\    *   *
   /______\\ \\
  |  PATRONUS |
   \\__________/
</pre>
<div style="color:#aaa; margin-top:4px;">A blinding silver light fills the terminal...<br>It takes the shape of a <strong>stag — your coding patronus.</strong></div><br>`;

export const wingardiumText = `
<div>🪄 <em>Wingardium Levi-<strong>O</strong>-sa!</em></div>
<div style="color:#aaa; margin-top:6px;">The entire terminal rises... floats... and lands gracefully.</div>
<pre class="ascii-art" style="color:var(--accent-color); font-size:0.8rem; margin-top:8px;">
    ✦ ✦ ✦ ✦ ✦
       wand/
      /----
</pre><br>`;

// ── Star Wars ──────────────────────────────────────────────────────────────
export const yodaText = `
<pre class="ascii-art" style="color:#ccc; font-size:0.8rem;">
        ____
    .-"      "-.
   /  *    *    \\
  |  o  __  o   |
  |    /  \\     |
   \\  (    )   /
    '-.\\__/.-'
       |  |
      /|  |\\
     (_|  |_)

    — Master Yoda —
</pre>
<div style="color:var(--accent-color); font-style:italic;">"Do or do not. There is no try."</div>
<div style="color:#aaa; font-size:0.88rem; margin-top:6px;">
  Strong with the Force, this terminal is.<br>
  Learn data science, you must.<br>
  The dark side of overfitting — fear it.
</div><br>`;

export const vaderText = `
<div class="vader-breath">
<pre class="ascii-art" style="font-size:0.8rem; margin-top:10px;">
        _.-'~~~~~~~'-._
      /   _.-~\\/~-._   \\
     |   |   |\\|   |   |
     |   |   |/|   |   |
     |   |___|/|___|   |
     |  /     |     \\  |
     \\_/_/'~~\\|/~~'\\_\\_/
</pre>
<div style="font-weight:bold; font-size:1.1rem; text-align:center; margin-top:10px;">
  "I find your lack of faith disturbing."
</div>
</div><br>`;

export const r2d2Text = `
<pre class="ascii-art" style="color:#ccc; font-size:0.8rem;">
    .--------.
   /  ______  \\
  |  / ____ \\  |
  | | (    ) | |
  | |  \\__/  | |
  |  \\______/  |
  |____________|
  | [O]  [  ] |
  |____________|
    |        |
   /|        |\\
  (_|        |_)

    — R2-D2 —
</pre>
<div style="color:var(--accent-color);">Bwop-bwop-bweeep! ✦ (Translation: <em>"Your code compiled!"</em>)</div><br>`;

export const starWarsText = `
<div class="whoami-card">
  <div style="color:var(--accent-color); letter-spacing:0.15em; margin-bottom:10px;">A LONG TIME AGO IN A TERMINAL FAR, FAR AWAY...</div>
  <pre class="ascii-art" style="font-size:0.75rem; color:#ccc; margin-bottom:8px;">
 ___ _            __      __
/ __| |_ __ _ _ _  \\ \\    / /_ _ _ _ ___
\\__ \\  _/ _\` | '_|  \\ \\/\\/ / _\` | '_(_-<
|___/\\__\\__,_|_|     \\_/\\_/\\__,_|_| /__/
  </pre>
  <div class="whoami-row"><span class="whoami-label">episode</span><span class="whoami-value">Portfolio — A New Hope</span></div>
  <div class="whoami-row"><span class="whoami-label">hero</span><span class="whoami-value">Teo Clerici (probably a Skywalker)</span></div>
  <div class="whoami-row"><span class="whoami-label">mentor</span><span class="whoami-value">Data, Python, and caffeine</span></div>
  <div class="whoami-row"><span class="whoami-label">mission</span><span class="whoami-value">Destroy the Death Star of ignorance</span></div>
  <div class="whoami-row"><span class="whoami-label">quote</span><span class="whoami-value">"May the <code>for</code> be with you."</span></div>
</div><br>`;

export const mayTheForceText = `<div style="color:var(--accent-color); font-size:1.1rem; font-style:italic; text-align:center; padding:12px;">✦ May the <code>for</code> be with you. ✦</div><br>`;

// ── Studio Ghibli ──────────────────────────────────────────────────────────
export const totoroText = `
<pre class="ascii-art" style="color:#ccc; font-size:0.8rem;">
      ___     ___
     (o o)   (o o)
    (  V  ) (  V  )
   /--m-m---m-m--\\
  / | O   O | \\
 /  |  \\./  |  \\
|   | Totoro|   |
 \\  |_______|  /
  \\ |       | /
   \\|_______|/
    |       |
   /|       |\\
  (_|       |_)

    — Totoro —
</pre>
<div style="color:var(--accent-color); font-style:italic;">"My Neighbor Totoro" — Hayao Miyazaki, 1988</div>
<div style="color:#aaa; margin-top:6px;">
  🌿 There's something magical about forests, spirits,<br>
  and code that <em>just works</em> on the first try. Rare.
</div><br>`;

export const ghibliText = `
<div class="whoami-card">
  <div style="color:var(--accent-color); letter-spacing:0.1em; margin-bottom:10px;">🌿 STUDIO GHIBLI — SPIRIT ROSTER</div>
  <div class="whoami-row"><span class="whoami-label">totoro</span><span class="whoami-value">Forest spirit. Very huggable. Type: <span class="command-highlight" data-cmd="totoro">totoro</span></span></div>
  <div class="whoami-row"><span class="whoami-label">chihiro</span><span class="whoami-value">"You have to be patient. And brave." — Spirited Away</span></div>
  <div class="whoami-row"><span class="whoami-label">calcifer</span><span class="whoami-value">Fire demon. Keeps Howl's Moving Castle warm. Relatable.</span></div>
  <div class="whoami-row"><span class="whoami-label">kiki</span><span class="whoami-value">Tired witch deliveries. Peak work-life balance.</span></div>
  <div class="whoami-row"><span class="whoami-label">reason</span><span class="whoami-value">Ghibli films remind you that wonder and hard work coexist.</span></div>
</div><br>`;

export const spiritedText = `
<div style="border-left:3px solid var(--accent-color); padding:12px 16px; background:rgba(0,20,0,0.2); border-radius:0 8px 8px 0;">
  <div style="color:var(--accent-color); font-size:0.75rem; letter-spacing:0.1em;">SPIRITED AWAY — CHIHIRO'S LESSON</div>
  <br>
  <div style="font-style:italic; color:#ddd;">&ldquo;Once you do something, you never forget it.<br>Even if you can't remember it.&rdquo;</div>
  <div style="color:#888; margin-top:6px;">— Zeniba, Spirited Away (2001)</div>
  <br>
  <div style="color:#aaa; font-size:0.88rem;">
    Chihiro lost her name but kept her identity.<br>
    Kind of like losing a variable and then finding it<br>
    was in scope the whole time.
  </div>
</div><br>`;

// ── Spider-Man extended ────────────────────────────────────────────────────
export const spiderManText = `
<div class="spidey-swing" style="color:#e23636; text-shadow: 1px 1px 0 #005ce6;">
<pre class="ascii-art" style="font-size:0.8rem;">
      /\\    /\\
     /  \\  /  \\
    |____\\/____|
    |          |
    \\___/\\/\\___/
</pre>
<div style="font-style:italic;">"With great power comes great responsibility." 🕸️</div>
</div><br>`;

export const pascalText = `
<div class="pascal-rainbow">
<pre class="ascii-art" style="font-size:0.8rem;">
     __
    /  \\
   |  O |
   |____|
    /  \\
</pre>
</div><br>`;

// ── NEW EASTER EGGS ─────────────────────────────────────────────────────────

export const easterEggsText = `
<div class="help-container">
  <div class="section-title">SECRET EASTER EGGS</div>
  <br>
  <div style="color:#aaa; font-style:italic; margin-bottom: 10px;">You found the master list! Here are all the hidden commands:</div>
  <div class="help-grid">
    <div class="help-item"><span class="command-highlight" data-cmd="interstellar">interstellar</span><span class="help-desc">Do not go gentle...</span></div>
    <div class="help-item"><span class="command-highlight" data-cmd="tars">tars</span><span class="help-desc">Honesty: 90%</span></div>
    <div class="help-item"><span class="command-highlight" data-cmd="accio cv">accio cv</span><span class="help-desc">🪄 Summon the CV</span></div>
    <div class="help-item"><span class="command-highlight" data-cmd="avengers">avengers</span><span class="help-desc">Assemble.</span></div>
    <div class="help-item"><span class="command-highlight" data-cmd="expecto patronum">expecto patronum</span><span class="help-desc">Cast your Patronus ✨</span></div>
    <div class="help-item"><span class="command-highlight" data-cmd="wingardium leviosa">wingardium leviosa</span><span class="help-desc">Levi-O-sa 🪄</span></div>
    <div class="help-item"><span class="command-highlight" data-cmd="starwars">starwars</span><span class="help-desc">A long time ago...</span></div>
    <div class="help-item"><span class="command-highlight" data-cmd="yoda">yoda</span><span class="help-desc">Do or do not.</span></div>
    <div class="help-item"><span class="command-highlight" data-cmd="vader">vader</span><span class="help-desc">I find your lack of commits disturbing.</span></div>
    <div class="help-item"><span class="command-highlight" data-cmd="r2d2">r2d2</span><span class="help-desc">Bwop-bweeep! 🤖</span></div>
    <div class="help-item"><span class="command-highlight" data-cmd="totoro">totoro</span><span class="help-desc">🌿 My Neighbor Totoro</span></div>
    <div class="help-item"><span class="command-highlight" data-cmd="ghibli">ghibli</span><span class="help-desc">Studio Ghibli spirit roster</span></div>
    <div class="help-item"><span class="command-highlight" data-cmd="spiderman">spiderman</span><span class="help-desc">🕷️ With great power...</span></div>
    <div class="help-item"><span class="command-highlight" data-cmd="pascal">pascal</span><span class="help-desc">🦎 Pascal the chameleon</span></div>
    <div class="help-item"><span class="command-highlight" data-cmd="funfact">funfact</span><span class="help-desc">Random fun fact 🧠</span></div>
    <div class="help-item"><span class="command-highlight" data-cmd="groot">groot</span><span class="help-desc">🌳 I am Groot</span></div>
    <div class="help-item"><span class="command-highlight" data-cmd="guardians">guardians</span><span class="help-desc">🌌 Guardians of the Galaxy</span></div>
    <div class="help-item"><span class="command-highlight" data-cmd="starlord">starlord</span><span class="help-desc">🎧 Star-Lord</span></div>
    <div class="help-item"><span class="command-highlight" data-cmd="ironman">ironman</span><span class="help-desc">🤖 I am Iron Man</span></div>
    <div class="help-item"><span class="command-highlight" data-cmd="astrofact">astrofact</span><span class="help-desc">✨ Space facts</span></div>
    <div class="help-item"><span class="command-highlight" data-cmd="cat">cat</span><span class="help-desc">🐱 Meow</span></div>
    <div class="help-item"><span class="command-highlight" data-cmd="pato">pato</span><span class="help-desc">🦆 Quack</span></div>
    <div class="help-item"><span class="command-highlight" data-cmd="gargantua">gargantua</span><span class="help-desc">🌀 Black hole from Interstellar</span></div>
  </div>
</div><br>`;

export const grootText = `
<div class="groot-sway">
<pre class="ascii-art" style="font-size:0.8rem;">
       _--_
      /    \\
     | O  O |
     |  __  |
      \\____/
      |    |
     /|    |\\
    /_|    |_\\
</pre>
<div style="color:#8b5a2b; font-weight:bold; font-size: 1.2rem;">"I am Groot."</div>
</div><br>`;

export const guardiansText = `
<div class="whoami-card">
  <div style="color:var(--accent-color); letter-spacing:0.1em; margin-bottom:8px;">GUARDIANS OF THE GALAXY</div>
  <div class="whoami-row"><span class="whoami-label">team</span><span class="whoami-value">A bunch of a-holes (but they're our a-holes)</span></div>
  <div class="whoami-row"><span class="whoami-label">mission</span><span class="whoami-value">Saving the galaxy, again?</span></div>
  <div class="whoami-row"><span class="whoami-label">music</span><span class="whoami-value">Awesome Mix Vol. 1 & 2</span></div>
</div><br>`;

export const starlordText = `
<pre class="ascii-art" style="color:#d9534f; font-size:0.8rem;">
    ____
  .'::::'.
 /::::::::\\
 |::::::::|
 \\::::::::/
  '::::..'
</pre>
<div style="color:var(--accent-color); font-style:italic;">"I'm Star-Lord, man. Legendary outlaw?"</div>
<div style="color:#aaa; font-size:0.88rem; margin-top:6px;">Put on your headphones and start dancing. 🎧</div><br>`;

// ── HACKER UTILITIES ────────────────────────────────────────────────────────
export const teofetchText = `
<div style="display: flex; flex-direction: row; gap: 20px; align-items: center; margin-bottom: 10px;">
<pre class="ascii-art" style="color:var(--accent-color); font-size: 0.75rem; margin: 0;">
       _,met$$$$$gg.
    ,g$$$$$$$$$$$$$$P.
  ,g$$P"     """Y$$.".
 ,$$P'              \`$$$.
',$$P       ,ggs.     \`$$b:
\`d$$'     ,$P"'   .    $$$
 $$P      d$'     ,    $$P
 $$:      $$.   -    ,d$$'
 $$;      Y$b._   _,d$P'
 Y$$.    \`.\`"Y$$$$P"'
 \`$$b      "-.__
  \`Y$$
   \`Y$$.
     \`$$b.
       \`Y$$b.
          \`"Y$b._
              \`"""
</pre>
<div style="color:#ccc; font-size: 0.9rem; line-height: 1.5;">
  <span style="color:var(--accent-color); font-weight:bold;">visitor</span>@<span style="color:var(--accent-color); font-weight:bold;">teoclerici</span><br>
  -------------------------<br>
  <span style="color:var(--accent-color);">OS:</span> TeoOS v20.26<br>
  <span style="color:var(--accent-color);">Host:</span> H-Farm Campus<br>
  <span style="color:var(--accent-color);">Kernel:</span> AI & Data Science<br>
  <span style="color:var(--accent-color);">Uptime:</span> 21 years, 4 months<br>
  <span style="color:var(--accent-color);">Packages:</span> 42 (React, Python, C++, etc.)<br>
  <span style="color:var(--accent-color);">Shell:</span> bash-teo<br>
  <span style="color:var(--accent-color);">Theme:</span> Glassmorphism Dark<br>
  <span style="color:var(--accent-color);">Brain CPU:</span> 85% (Coffee required)<br>
  <span style="color:var(--accent-color);">Memory:</span> 16GB / 2.5PB (Biological)<br>
  <br>
  <div style="display:flex; gap:4px;">
    <span style="display:inline-block; width:12px; height:12px; background:#000;"></span>
    <span style="display:inline-block; width:12px; height:12px; background:#f00;"></span>
    <span style="display:inline-block; width:12px; height:12px; background:#0f0;"></span>
    <span style="display:inline-block; width:12px; height:12px; background:#ff0;"></span>
    <span style="display:inline-block; width:12px; height:12px; background:#00f;"></span>
    <span style="display:inline-block; width:12px; height:12px; background:#f0f;"></span>
    <span style="display:inline-block; width:12px; height:12px; background:#0ff;"></span>
    <span style="display:inline-block; width:12px; height:12px; background:#fff;"></span>
  </div>
</div>
</div><br>`;

export const htopText = `
<pre class="ascii-art" style="color:#aaa; font-size:0.75rem; line-height: 1.2;">
  1  [||||||||||||||||||||||||||||||||||||||||       85.2%]   Tasks: 42, 1 thr; 3 running
  2  [|||||||||||||||||||||||||||||                  42.8%]   Swapping: 0k total, 0k free
  Mem[|||||||||||||||||||||||||||||||||||||||||||3.2G/16.0G]   Load average: 1.02 1.45 1.12
  Swp[                                                0K/0K]   Uptime: 21 years

  PID USER      PRI  NI  VIRT   RES   SHR S CPU% MEM%   TIME+  Command
 1042 teo        20   0  4.2G  1.1G   50M R 85.0  6.8  4:20:01 ./learning_machine_learning.sh
    1 root       20   0 10.5M  2.2M  1.1M S  0.0  0.0 99:59:59 /sbin/init
   42 teo        20   0  200M   50M   10M S  2.0  0.3  0:05:20 code /portfolio
 4040 teo        20   0  1.1G  200M   80M S  0.0  1.2 12:00:00 spotify (Lofi Girl)
 9999 teo        20   0  500M  100M   20M R 10.0  0.6  0:01:12 node server.js
</pre><br>`;

export const ironmanText = `
<div class="ironman-hud">
<div class="whoami-card" style="border-color:#ff2a2a; background:rgba(255,0,0,0.05);">
  <div style="color:#ff2a2a; letter-spacing:0.1em; margin-bottom:8px;">STARK INDUSTRIES DATABASE</div>
  <div class="whoami-row"><span class="whoami-label" style="color:#ff2a2a;">identity</span><span class="whoami-value">Tony Stark</span></div>
  <div class="whoami-row"><span class="whoami-label" style="color:#ff2a2a;">status</span><span class="whoami-value">Genius, billionaire, playboy, philanthropist.</span></div>
  <div class="whoami-row"><span class="whoami-label" style="color:#ff2a2a;">jarvis</span><span class="whoami-value">"Sometimes you gotta run before you can walk."</span></div>
</div>
<div style="color:#ff2a2a; font-style:italic; margin-top:10px;">"I am Iron Man."</div>
</div><br>`;

export const catText = `
<pre class="ascii-art pet-bounce" style="color:#ccc; font-size:0.8rem; display:inline-block;">
   /\\_/\\
  ( o.o )
   > ^ <
</pre>
<div style="color:var(--accent-color); font-style:italic;">Meow. (You found the cat!) 🐱</div><br>`;

export const patoText = `
<pre class="ascii-art pet-bounce" style="color:#ffcc00; font-size:0.8rem; display:inline-block;">
    _
  >(.)__
   (___/
</pre>
<div style="color:var(--accent-color); font-style:italic;">Quack. (You found the duck!) 🦆</div>
<div style="color:#aaa; font-size:0.88rem; margin-top:6px;">Rubber duck debugging activated. Need to talk through some code?</div><br>`;

export const gargantuaText = `
<div class="gargantua-warp" style="text-align:center; width:100%;">
<pre class="ascii-art" style="color:#fff; font-size:0.35rem; letter-spacing:-0.5px; line-height:1; display:inline-block; filter:drop-shadow(0 0 15px rgba(255,150,50,0.8));">
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%%######***+++=+===---:--:::::.::::.::::--:---=====++++****####%%@%@@@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%@@@@@@%@@%%%%%%#%%#%%####%%##%#########%%#%%%%%%%%%%@@%@@@@@@%@@@@@@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%%%%%%%##%############****#############%#%#%%%%%%%%%@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%@@@@%%%%%%%%%%%######*****#*#%######**##*##########%%%%%%%%%%@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%%%%%%%#%##%###****###**+++++=+++=**###*******#####%#%%%%%%%%%@%@@@@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@@@@%%%%%@%%%%#%######***%#*+=====--:::::--======+*#*##**#*######%%%%%%%@%@@@@%@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@@@@@%%%%%%%%%%##%###*##+:==:.  .             .=+==-******######%##%%%%%@%@%@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@@@@%@%%%%%%####****%+===-. .   ............      :=-:++*+****#*##%##%%%%%%@@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@@@%%%%%%%######+*#+-+:.    ....:::::::::........    --=-********#####%%%%%@%@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@%@%%@%%%#####***+##=-- .  ..:::..           ..:::..:. . :+:-*+*+****###%#%%%%%%%@%@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@%%%#%%##%##*+*+===.:....:.:.   :=-::::::..   ...:....   -=:=+******##%#%%%%%%%%%@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@%%%%%%%###*#**%=+:.:.:..::.  -*= :=++++++=+=:.  ...::.:.  .==:=*******###%##%%%@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@%%%%%%%%%#%#=*##:==.:...::.  -*- +*+++====+==+=+=.. .:....:.  -=-:=**#**####%%%%%%%%@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@%%%%%%%%@%*-+#+-+=.::..::. .++.=++=+=+++++=+++++=++:....::::.. .++--+#%#%####%%%%@%@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@@@@@@*..%@*--=.:= .:.. .*= **++++=============-==-....::::: ..=*+--:+#%@@@@@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@@%#+-+%@@%-===-: ..:...-=.+=====+++++++++++=======...:..:.:-.  .=##@%++==+-=-======+*##%@@@@@@@@
@+@%@@@@@@@@@@@@@@@@%-:-#%@@@@*   ++-: ......=+=:==+==++++++++++=======-+-..:...:...-:.     .-=+#%@@@@@@@@@@@@@@@@#%#+#
@@@   =#+ :%-        .-:  .  .:+*=...........-: -+=================----:.:..............            ..=::.   .--=*#%%%#
@@@@@@@.=+-                              .......                        ..........         ::..         .-%#==+@*##@@@@
@@@@@@@@@@@@@@@@@@@@@@@@@%##**++===-==----:::.:..:.....      .::....:--:::..:..:.....:-----::-+##@@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@@@@%@@%%%###***+*..:::.=*=+++==+=======--====---=+=:.::-=-+*++++**%%@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@%@@%%%%%%######*##***+++==  .....+=.*+++++++++++++++++++++=..: ..====+++*##**#**#######%%@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@%%%%%%%##****+++-+  .::. .++.=+===+=+++++=++=+*++-...:.:.+-=+++++++++*###%%%@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@%@@%%%%%%###***++*==:  ..:.  ++.=***++++++++++***-:  .:...:*=++**#*###%%%#%%%%%%@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@%%%#%%####*#**+++-:  .....  =*: ==+********=.:  .:. .:.===*****######%%%%%%%%@@%@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@%%%%%%#####****+*=+=  ..:...   :=-:::::....   .:..   .+=+#****####%%%%%%%%@%@%@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@@%%%%%%%%######***+=+.  ..::::.            .....    -*++***######%#%%%%%%%@@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@%@%%%%%%######*****+*+*     ............::.:.     -*=++*#***######%%%%%@%@%@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@@@@%%%%%%%%#####***#*+*+*-       ......        :+*++*%##*######%%%%%%%%@@@@@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@%@@@%@@%%%%%%#######***#**+=+=:.            :-+*++**##**####%%#%%%%@%%%%@@@@@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%%%%%@#########**##*++**************++########%####%%%%%%%@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%@@%%%%%%%%%%###*###**###*#**+******#%##**###*###%%%%%%%%%@%%%@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@@@@%@%%@%@%%%%%%%###%###*####*****#*#*##*****######%##%#%%%#%%@@@@@@@%@@@@@@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@@@%%%####***++++===---:::.......          ......::::---===+++***#*##%%%%@%@@@@@@@@@@@@@@@@@@@@@@
</pre>
<div style="color:#ffbd2e; font-size:1.2rem; font-weight:bold; letter-spacing:4px; margin-top:10px; text-shadow:0 0 20px #ffbd2e;">GARGANTUA</div>
<div style="color:#aaa; font-style:italic; margin-top:5px;">"It's not possible... No, it's necessary."</div>
</div><br>`;

const astrofacts = [
    '✨ A day on Venus is longer than a year on Venus.',
    '✨ Neutron stars can spin at a rate of 600 rotations per second.',
    '✨ There is a planet made of diamonds twice the size of Earth, called 55 Cancri e.',
    '✨ The footprint on the moon will be there for 100 million years.',
    '✨ There are more trees on Earth than stars in the Milky Way.',
    '✨ The Sun makes up 99.86% of the mass in the solar system.',
    '✨ If two pieces of the same type of metal touch in space, they will bond permanently (cold welding).',
    '✨ Space is completely silent because there is no atmosphere for sound to travel.',
];

export const getRandomAstrofact = () => {
    const fact = astrofacts[Math.floor(Math.random() * astrofacts.length)];
    return `<div style="border-left:2px solid #ffbd2e; padding-left:12px; color:#ddd; margin:4px 0; line-height:1.7;">${fact}</div><br>`;
};

// ── funfact pool ───────────────────────────────────────────────────────────
const funfacts = [
    '🕷️ A group of crows is called a "murder." A group of programmers is called a "merge conflict."',
    '🌌 There are more possible iterations of a game of chess than there are atoms in the known universe.',
    '🐙 Octopuses have three hearts, nine brains, and blue blood. Also, they\'re smarter than most production code.',
    '🚀 NASA\'s Apollo 11 guidance computer had 4 KB of RAM. Your phone has about 4,000,000x more.',
    '⚡ Lightning strikes Earth about 100 times per second. Most of those go undebugged.',
    '🐬 Dolphins have names for each other. Scientists believe they call each other by signature whistles.',
    '🌍 The Eiffel Tower grows about 15 cm taller in summer due to thermal expansion. Buildings ship hotfixes too.',
    '🧠 The human brain can store approximately 2.5 petabytes of data. Git blame might disagree.',
    '🐝 A single honeybee produces about 1/12 of a teaspoon of honey in her lifetime. Respect the effort.',
    '🎵 The song "Happy Birthday to You" was under copyright until 2016. Royalties: disturbing.',
    '🦈 Sharks are older than trees. Trees: ~350M years. Sharks: ~450M years.',
    '📡 Voyager 1 is ~24 billion km away and still sending data on a 22-watt transmitter — less than a light bulb.',
    '🔢 The word "algorithm" comes from the name of Persian mathematician Al-Khwarizmi (c. 780–850 AD).',
    '🌊 About 95% of the ocean is unexplored. The same applies to half this terminal\'s easter eggs.',
    '🍕 The word "pizza" first appeared in a Latin text in southern Italy in 997 AD. You\'re welcome.',
    '🐧 Penguins propose to their mates with pebbles. Commit messages are this generation\'s pebbles.',
    '🦎 Chameleons don\'t change color to camouflage — they communicate emotions and temperature via color.',
    '🌸 Cherry blossoms (sakura) have been observed and documented in Japan since 812 AD.',
    '🤖 The word "robot" comes from the Czech word "robota," meaning drudgery or forced labor. Poetic.',
    '🎮 The original Doom (1993) ran on less computing power than a modern thermostat.',
];

export const getRandomFunfact = () => {
    const fact = funfacts[Math.floor(Math.random() * funfacts.length)];
    return `<div style="border-left:2px solid var(--accent-color); padding-left:12px; color:#ddd; margin:4px 0; line-height:1.7;">${fact}</div><br>`;
};

export const emailText = `
<pre class="ascii-art" style="color:var(--accent-color); font-size:0.6rem;">
  _____________________ 
 |  _________________  |
 | |                 | |
 | |   teoclerici    | |
 | |      mail       | |
 | |_________________| |
 |_____________________|
    \\ /           \\ /   
     V             V    
</pre>
<div style="color:#aaa;">Initializing mail protocol...</div><br>`;


// commandsList is likewise derived — see src/commands/registry.js.
