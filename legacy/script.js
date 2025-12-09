// --- Data ---
const cvData = {
    'about': `
<span class="section-title">PROFESSIONAL SUMMARY</span>
AI & Data Science student at <strong>University of Chichester - H-Farm Campus</strong> with over 3 years of mentoring experience in international hackathons and educational programs. 
Passionate about using <strong>technology</strong>, <strong>data analytics</strong>, and <strong>education</strong> to create positive impact. 
Founder and coordinator of student initiatives, combining technical knowledge with leadership and scientific curiosity in areas such as <strong>astrophysics</strong>. 
Trilingual communicator with proven ability to guide diverse teams.
`,
    'education': `
<span class="section-title">EDUCATION</span>
<span class="list-item"><strong>Bachelor of Science in AI & Data Science</strong> (Sep 2025 - May 2028)
   University of Chichester - H-Farm Campus (Venice, Italy)
   <br>&nbsp;&nbsp;• Partnership with Microsoft.
   <br>&nbsp;&nbsp;• Key highlights: Machine Learning, Python, Cloud Computing, Data Analysis, Power BI.
   <br>&nbsp;&nbsp;• Active member of multicultural student community and campus startup ecosystem.</span>

<span class="list-item"><strong>Technology Baccalaureate, Engineering & Technology</strong> (Sep 2023 - Jun 2025)
   CIC Escola (Barcelona, Spain) | Grade: 8.29/10
   <br>&nbsp;&nbsp;• Strong STEM foundation with engineering specialization.
   <br>&nbsp;&nbsp;• Active participant in MIT&CIC Hackathons.</span>
`,
    'experience': `
<span class="section-title">PROFESSIONAL EXPERIENCE</span>
<span class="list-item"><strong>Consultant</strong> @ Lumina Consulting Agency (Oct 2025 - Present)
   <br>&nbsp;&nbsp;• Student-led advisory in Business, Media, and AI.
   <br>&nbsp;&nbsp;• Crafting forward-thinking solutions bridging generational perspectives.</span>

<span class="list-item"><strong>Educational Mentor</strong> @ MIT Edgerton Center & Fundació CIC (Jan 2025 - Present)
   <br>&nbsp;&nbsp;• <strong>MIT BCN Squad</strong>: Mentored at international/local engineering workshops.
   <br>&nbsp;&nbsp;• <strong>Events</strong>: MIT&CIC&UPC Hackathon, TechProjects 2025, International Hackathon Mexico.</span>

<span class="list-item"><strong>Private Tutor</strong> @ Self-Employed (Sep 2022 - Jun 2024)
   <br>&nbsp;&nbsp;• Programming (Python, C++) and Mathematics support for secondary students.</span>

<span class="list-item"><strong>Environmental Research Participant</strong> @ Generalitat de Catalunya (Jun 2021 - Aug 2024)
   <br>&nbsp;&nbsp;• Bird migration and ecosystem monitoring.</span>
`,
    'projects': `
<span class="section-title">PROJECTS & INITIATIVES</span>
<span class="list-item"><strong>H-Altura Club</strong> (Founder)
   <br>&nbsp;&nbsp;• Founded student outdoor activities club at H-Farm Campus.
   <br>&nbsp;&nbsp;• Engaged 100+ participants in wellbeing and leadership events.</span>

<span class="list-item"><strong>MIT&CIC Hackathons</strong> (Mentor)
   <br>&nbsp;&nbsp;• Mentored multi-national teams in project development and prototyping.</span>
`,
    'skills': `
<span class="section-title">SKILLS</span>
<span class="list-item"><strong>Technical:</strong>
   <br>&nbsp;&nbsp;• Programming: Python, C++, Arduino, Go (basic), JavaScript (basic)
   <br>&nbsp;&nbsp;• Data: Machine Learning, Data Analysis, Data Visualization, Power BI
   <br>&nbsp;&nbsp;• Tools: Git/GitHub, Linux, LaTeX, 3D Printing, Autodesk Fusion 360</span>

<span class="list-item"><strong>Soft Skills:</strong>
   <br>&nbsp;&nbsp;• Public Speaking, Team Collaboration, Event Coordination, Time Management.</span>

<span class="list-item"><strong>Creative:</strong>
   <br>&nbsp;&nbsp;• Photography, Video Editing, Drone Piloting.</span>
`,
    'certifications': `
<span class="section-title">CERTIFICATIONS</span>
<span class="list-item"><strong>Business Intelligence and Data Analytics (Power BI)</strong> - Microsoft (2025)</span>
<span class="list-item"><strong>Bojos per la Ciència: Inteligencia Artificial</strong> - Fundació Catalunya La Pedrera (2024)</span>
<span class="list-item"><strong>English Language Certification (Level B2)</strong> - Cambridge (2023)</span>
<span class="list-item"><strong>C++ Programming - Competitive Programming</strong> - OIE (2022)</span>
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
Nature Photography, Mountain Hiking, AI & Machine Learning, Educational Technology, Startup Ecosystem, Consulting, Astrophysics.
`,
    'contact': `
<span class="section-title">CONTACT</span>
<span class="list-item"><strong>Email:</strong> <a href="mailto:clerici.teo5@gmail.com">clerici.teo5@gmail.com</a></span>
<span class="list-item"><strong>Phone:</strong> +34 615 451 338</span>
<span class="list-item"><strong>Location:</strong> Venice, Italy</span>
<span class="list-item"><strong>LinkedIn:</strong> <a href="https://linkedin.com/in/teo-clerici" target="_blank">linkedin.com/in/teo-clerici</a></span>
`
};

const helpText = `
<span class="section-title">AVAILABLE COMMANDS</span>
<span class="command-highlight" onclick="runCmd('about')">about</span>          - Professional summary
<span class="command-highlight" onclick="runCmd('education')">education</span>      - Academic background
<span class="command-highlight" onclick="runCmd('experience')">experience</span>     - Work history
<span class="command-highlight" onclick="runCmd('projects')">projects</span>       - Initiatives & Projects
<span class="command-highlight" onclick="runCmd('skills')">skills</span>         - Technical & Soft skills
<span class="command-highlight" onclick="runCmd('certifications')">certifications</span> - Certificates & Awards
<span class="command-highlight" onclick="runCmd('languages')">languages</span>      - Spoken languages
<span class="command-highlight" onclick="runCmd('interests')">interests</span>      - Personal interests
<span class="command-highlight" onclick="runCmd('contact')">contact</span>        - Contact information
<span class="command-highlight" onclick="runCmd('clear')">clear</span>          - Clear the terminal
<span class="command-highlight" onclick="runCmd('help')">help</span>           - Show this help message
`;

const asciiArt = `
<div class="ascii-art">
████████╗███████╗ ██████╗     ██████╗██╗     ███████╗██████╗ ██╗ ██████╗██╗
╚══██╔══╝██╔════╝██╔═══██╗   ██╔════╝██║     ██╔════╝██╔══██╗██║██╔════╝██║
   ██║   █████╗  ██║   ██║   ██║     ██║     █████╗  ██████╔╝██║██║     ██║
   ██║   ██╔══╝  ██║   ██║   ██║     ██║     ██╔══╝  ██╔══██╗██║██║     ██║
   ██║   ███████╗╚██████╔╝   ╚██████╗███████╗███████╗██║  ██║██║╚██████╗██║
   ╚═╝   ╚══════╝ ╚═════╝     ╚═════╝╚══════╝╚══════╝╚═╝  ╚═╝╚═╝ ╚═════╝╚═╝
</div>
<div class="subtitle">AI & Data Science Student | Full Stack Developer</div>
<div>Type <span class="command-highlight" onclick="runCmd('help')">'help'</span> to see available commands.</div>
<br>
`;

// --- State ---
const commands = ['help', 'about', 'education', 'experience', 'projects', 'skills', 'certifications', 'languages', 'interests', 'contact', 'clear'];
let commandHistory = [];
let historyIndex = -1;
let isTyping = false;
let typeSpeed = 10; // ms per character
let skipTyping = false;

// --- Elements ---
const input = document.getElementById('command-input');
const output = document.getElementById('output');
const terminalBody = document.getElementById('terminal-body');
const terminalWrapper = document.getElementById('terminal-wrapper');
const turbulence = document.querySelector('feTurbulence');

// --- Initialization ---
window.onload = async () => {
    input.focus();
    animateLiquid();
    // Print ASCII art with typewriter effect
    await printHTML(asciiArt, true);
};

// Focus input when clicking anywhere in terminal
terminalWrapper.addEventListener('click', (e) => {
    // If typing, click skips the animation
    if (isTyping) {
        skipTyping = true;
        return;
    }
    
    // Don't focus if clicking a link or interactive element
    if (e.target.tagName !== 'A' && !e.target.classList.contains('command-highlight')) {
        input.focus();
    }
});

// --- Mouse Interaction (Tilt Only) ---
document.addEventListener('mousemove', (e) => {
    const x = e.clientX;
    const y = e.clientY;
    
    // Tilt Effect
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    
    // Max rotation degrees
    const maxRot = 5;
    
    const rotX = ((y - centerY) / centerY) * -maxRot; // Invert Y for correct tilt
    const rotY = ((x - centerX) / centerX) * maxRot;

    terminalWrapper.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
});

// --- Liquid Animation ---
let frames = 0;
function animateLiquid() {
    frames += 0.002;
    // Animate baseFrequency to create flowing effect
    const val = 0.005 + Math.sin(frames) * 0.002; 
    turbulence.setAttribute('baseFrequency', `0.005 ${val}`);
    requestAnimationFrame(animateLiquid);
}

// --- Event Listeners ---
input.addEventListener('keydown', async (e) => {
    if (isTyping) {
        e.preventDefault();
        skipTyping = true; // Any key press during typing skips it
        return;
    }

    if (e.key === 'Enter') {
        const cmd = input.value.trim();
        if (cmd) {
            commandHistory.push(cmd);
            historyIndex = commandHistory.length;
            input.value = '';
            await handleCommand(cmd);
        }
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (historyIndex > 0) {
            historyIndex--;
            input.value = commandHistory[historyIndex];
        } else if (historyIndex === -1 && commandHistory.length > 0) {
            historyIndex = commandHistory.length - 1;
            input.value = commandHistory[historyIndex];
        }
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (historyIndex < commandHistory.length - 1) {
            historyIndex++;
            input.value = commandHistory[historyIndex];
        } else {
            historyIndex = commandHistory.length;
            input.value = '';
        }
    } else if (e.key === 'Tab') {
        e.preventDefault();
        const current = input.value;
        if (current) {
            const match = commands.find(c => c.startsWith(current));
            if (match) {
                input.value = match;
            }
        }
    }
});

// --- Functions ---
window.runCmd = async function(cmd) {
    if (isTyping) return;
    input.value = cmd;
    commandHistory.push(cmd);
    historyIndex = commandHistory.length;
    input.value = '';
    await handleCommand(cmd);
    input.focus();
}

async function handleCommand(cmd) {
    // Disable input while processing
    input.disabled = true;
    
    const cmdLine = `<div class="input-line"><span class="prompt">visitor@teoclerici:~$</span> <span>${cmd}</span></div>`;
    await printHTML(cmdLine, false); // Print command echo instantly

    const lowerCmd = cmd.toLowerCase();

    if (lowerCmd === 'clear') {
        output.innerHTML = '';
    } else if (lowerCmd === 'help') {
        await printHTML(helpText, true);
    } else if (cvData[lowerCmd]) {
        await printHTML(cvData[lowerCmd], true);
    } else {
        await printHTML(`<div>Command not found: <span class="command-highlight">${cmd}</span>. Type 'help' for available commands.</div><br>`, true);
    }
    
    // Re-enable input
    input.disabled = false;
    input.focus();
    scrollToBottom();
}

async function printHTML(html, animate = false) {
    const div = document.createElement('div');
    output.appendChild(div);

    if (animate) {
        isTyping = true;
        skipTyping = false;
        await typeWriter(div, html);
        isTyping = false;
        skipTyping = false;
    } else {
        div.innerHTML = html;
    }
    
    scrollToBottom();
}

function scrollToBottom() {
    terminalBody.scrollTop = terminalBody.scrollHeight;
}

// Recursive Typewriter Function
async function typeWriter(container, html) {
    // Create a temporary container to parse the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    // Process nodes recursively
    await processNodes(tempDiv.childNodes, container);
}

async function processNodes(nodes, parent) {
    for (const node of nodes) {
        if (skipTyping) {
            // If skipping, just append the rest of the content immediately
            // We need to clone the node to move it effectively or just use innerHTML logic if possible
            // But since we are deep in recursion, let's just append the node fully
            const clone = node.cloneNode(true);
            parent.appendChild(clone);
            continue;
        }

        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent;
            for (const char of text) {
                if (skipTyping) {
                    parent.append(text.substring(text.indexOf(char)));
                    break;
                }
                parent.append(char);
                scrollToBottom();
                await wait(typeSpeed);
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node.cloneNode(false); // Clone element without children
            parent.appendChild(el);
            
            // Special handling for BR to add a small pause
            if (el.tagName === 'BR') {
                scrollToBottom();
                await wait(30);
            }

            // Recurse for children
            if (node.childNodes.length > 0) {
                await processNodes(node.childNodes, el);
            }
        }
    }
}

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

