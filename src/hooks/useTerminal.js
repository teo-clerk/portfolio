import { useState, useEffect, useRef } from 'react';
import {
    cvData, helpText, asciiArt, asciiArtMobile, asciiArtFull, commandsList,
    whoamiText, getRandomFortune, themeText, interstellarText, tarsText,
    accioText, avengersText, expectoText, wingardiumText,
    yodaText, vaderText, r2d2Text, starWarsText, mayTheForceText,
    totoroText, ghibliText, spiritedText, spiderManText, getRandomFunfact,
    pascalText, easterEggsText, grootText, ironmanText, catText, patoText, getRandomAstrofact,
    guardiansText, starlordText, teofetchText, htopText, snakeText, gargantuaText, emailText
} from '../data/cvData';
// Upgraded art pool (separate file to avoid backtick nesting issues)
import { getRandomArt } from '../data/randomArt';
import { askGrok } from '../services/aiService';

const THEMES = {
    purple: { accent: '#8A2BE2', bg: 'rgba(20, 20, 20, 0.5)' },
    green:  { accent: '#27c93f', bg: 'rgba(0, 20, 5, 0.55)' },
    amber:  { accent: '#ffbd2e', bg: 'rgba(20, 15, 0, 0.55)' },
};

const applyTheme = (name) => {
    const theme = THEMES[name];
    if (!theme) return false;
    document.documentElement.setAttribute('data-theme', name);
    document.documentElement.style.setProperty('--accent-color', theme.accent);
    document.documentElement.style.setProperty('--terminal-bg', theme.bg);
    return true;
};

export const useTerminal = () => {
    const [history, setHistory] = useState([]);
    const [inputVal, setInputVal] = useState('');
    const [commandHistory, setCommandHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [showGame, setShowGame] = useState(false);
    const [showMatrix, setShowMatrix] = useState(false);
    // Always init to true; the effect below will immediately hide if already booted
    const [showBoot, setShowBoot] = useState(true);
    const [isTyping, setIsTyping] = useState(false);
    const [globalVolume, setGlobalVolume] = useState(0.75);
    
    const inputRef = useRef(null);
    const terminalBodyRef = useRef(null);

    // Determine which ASCII art to show based on screen width
    const getAsciiArt = () => {
        if (window.innerWidth > 1200) return asciiArtFull;
        if (window.innerWidth > 768) return asciiArt;
        return asciiArtMobile;
    };

    // Helper to play sound
    const playSound = (soundFileName) => {
        try {
            const audio = new Audio(`/sounds/${soundFileName}`);
            audio.volume = globalVolume;
            audio.play().catch(e => console.warn('Audio playback prevented by browser', e));
        } catch (error) {
            console.error('Failed to play sound', error);
        }
    };

    const audioRefs = useRef({});

    // Helper to play looping sound
    const toggleLoopingSound = (soundName) => {
        try {
            if (audioRefs.current[soundName]) {
                audioRefs.current[soundName].pause();
                audioRefs.current[soundName].currentTime = 0;
                delete audioRefs.current[soundName];
                return false;
            } else {
                const audio = new Audio(`/sounds/${soundName}`);
                audio.loop = true;
                audio.volume = globalVolume;
                audio.play().catch(e => console.warn('Audio playback prevented by browser', e));
                audioRefs.current[soundName] = audio;
                return true;
            }
        } catch (error) {
            console.error('Failed to toggle sound', error);
            return false;
        }
    };

    // Initial greeting and Konami code
    useEffect(() => {
        // Immediately hide boot screen if already shown this session
        if (sessionStorage.getItem('booted') === 'true') {
            setShowBoot(false);
        }

        const art = getAsciiArt();
        setHistory([{ 
            id: 'init', 
            content: art, 
            type: 'output', 
            isAnimated: true 
        }]);

        // Konami Code listener
        const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
        let konamiIndex = 0;

        const handleKeyDown = (e) => {
            if (e.key === konamiCode[konamiIndex]) {
                konamiIndex++;
                if (konamiIndex === konamiCode.length) {
                    // Unlock God Mode
                    const godModeId = Date.now() + '-godmode';
                    setHistory(prev => [...prev, {
                        id: godModeId,
                        content: `<div style="color:gold; font-size:1.5rem; text-shadow: 0 0 10px gold;">🌟 GOD MODE ACTIVATED 🌟</div><br>`,
                        type: 'output',
                        isAnimated: true
                    }]);
                    applyTheme('amber');
                    playSound('yoda.mp3');
                    konamiIndex = 0;
                }
            } else {
                konamiIndex = 0;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Auto-scroll
    useEffect(() => {
        if (terminalBodyRef.current) {
            terminalBodyRef.current.scrollTop = terminalBodyRef.current.scrollHeight;
        }
    }, [history, isTyping]);

    // Update volume of already playing looping sounds when volume changes
    useEffect(() => {
        Object.values(audioRefs.current).forEach(audio => {
            if (audio) {
                audio.volume = globalVolume;
            }
        });
    }, [globalVolume]);

    const runCommand = (cmd) => {
        if (isTyping) return;
        
        const trimmedCmd = cmd.trim();
        if (!trimmedCmd) return;

        const newHistory = [...history];
        
        // Add command echo
        newHistory.push({
            id: Date.now() + '-cmd',
            content: `<div class="input-line"><span class="prompt">visitor@teoclerici:~$</span> <span>${trimmedCmd}</span></div>`,
            type: 'command',
            isAnimated: false
        });

        // Process command
        const lowerCmd = trimmedCmd.toLowerCase();
        let outputContent = '';
        let shouldAnimate = true;
        let specialAction = null;

        if (lowerCmd === 'clear') {
            setHistory([]);
            setInputVal('');
            return;
        } else if (lowerCmd === 'help') {
            outputContent = helpText;
        } else if (lowerCmd === 'commands') {
            // Secret testing command to list ALL strings in commandsList
            const sortedCmds = [...commandsList].sort();
            outputContent = `
<div class="help-container">
  <div class="section-title">ALL INTERNAL COMMANDS (DEBUG)</div>
  <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; margin-top: 10px;">
    ${sortedCmds.map(c => `<div class="command-highlight" style="font-size:0.85rem;" data-cmd="${c}">${c}</div>`).join('')}
  </div>
</div><br>`;
            shouldAnimate = false;
        } else if (lowerCmd === 'whoami') {
            outputContent = whoamiText;
        } else if (lowerCmd === 'game') {
            // Show command echo in history first, then show game
            setHistory([...newHistory]);
            setInputVal('');
            setTimeout(() => setShowGame(true), 50);
            return;
        } else if (lowerCmd === 'matrix') {
            // Flush history first, then activate matrix overlay
            setHistory([...newHistory]);
            setInputVal('');
            setTimeout(() => setShowMatrix(true), 50);
            return;
        } else if (lowerCmd === 'fortune') {
            outputContent = getRandomFortune();
            shouldAnimate = false;
        } else if (lowerCmd === 'download') {
            // Trigger CV PDF download
            specialAction = () => {
                const a = document.createElement('a');
                a.href = '/CV.pdf';
                a.download = 'Teo_Clerici_CV.pdf';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            };
            outputContent = `<div>📄 Downloading <strong>Teo_Clerici_CV.pdf</strong>...</div><br>`;
            shouldAnimate = false;
        } else if (lowerCmd.startsWith('open ')) {
            const target = lowerCmd.replace('open ', '').trim();
            const links = {
                linkedin: 'https://linkedin.com/in/teo-clerici',
                github:   'https://github.com/teo-clerk',
                email:    'mailto:clerici.teo5@gmail.com',
            };
            if (links[target]) {
                specialAction = () => window.open(links[target], '_blank');
                outputContent = `<div>🔗 Opening <strong>${target}</strong>...</div><br>`;
                shouldAnimate = false;
            } else {
                outputContent = `<div>Unknown target: <em>${target}</em>. Try: <span class="command-highlight" data-cmd="open linkedin">linkedin</span>, <span class="command-highlight" data-cmd="open github">github</span>, <span class="command-highlight" data-cmd="open email">email</span></div><br>`;
                shouldAnimate = false;
            }
        } else if (lowerCmd === 'theme') {
            outputContent = themeText;
            shouldAnimate = false;
        } else if (lowerCmd.startsWith('theme ')) {
            const themeName = lowerCmd.replace('theme ', '').trim();
            if (applyTheme(themeName)) {
                outputContent = `<div>🎨 Theme switched to <strong>${themeName}</strong>.</div><br>`;
            } else {
                outputContent = `<div>Unknown theme: <em>${themeName}</em>. Available: <span class="command-highlight" data-cmd="theme purple">purple</span>, <span class="command-highlight" data-cmd="theme green">green</span>, <span class="command-highlight" data-cmd="theme amber">amber</span></div><br>`;
            }
            shouldAnimate = false;
        } else if (lowerCmd.startsWith('sudo')) {
            const subcmd = trimmedCmd.replace(/sudo\s*/i, '').trim() || 'something';
            outputContent = `<div><span style="color:#ff5f56;">Permission denied</span>: you are not root.<br>With great power comes great responsibility — and you don't have <em>either</em> here.<br>Try <span class="command-highlight" data-cmd="contact">contact</span> if you want to talk.</div><br>`;
            shouldAnimate = false;
        } else if (lowerCmd.startsWith('calc ') || lowerCmd === 'calc') {
            const expression = trimmedCmd.replace(/^calc\s*/i, '').trim();
            if (!expression) {
                outputContent = `<div>Usage: <span class="command-highlight" data-cmd="calc 5 * 10">calc [math expression]</span></div><br>`;
            } else {
                try {
                    // Safe evaluation: only allow numbers, math operators, parens, and spaces
                    if (!/^[0-9+\-*/().\s]+$/.test(expression)) {
                        throw new Error('Invalid characters');
                    }
                    const result = new Function(`"use strict"; return (${expression})`)();
                    outputContent = `<div><span style="color:#aaa;">${expression} =</span> <strong>${result}</strong></div><br>`;
                } catch (e) {
                    outputContent = `<div style="color:#ff5f56;">Error evaluating expression. Usage: <span class="command-highlight" data-cmd="calc 5 * 4">calc [math]</span></div><br>`;
                }
            }
            shouldAnimate = false;
        } else if (lowerCmd === 'contact') {
            outputContent = `
<div class="whoami-card">
  <div style="color:var(--accent-color); letter-spacing:0.1em; margin-bottom:8px;">CONTACT INFORMATION</div>
  <div class="whoami-row"><span class="whoami-label">name</span><span class="whoami-value">Teo Clerici</span></div>
  <div class="whoami-row"><span class="whoami-label">email</span><span class="whoami-value"><a href="mailto:clerici.teo5@gmail.com">clerici.teo5@gmail.com</a></span></div>
  <div class="whoami-row"><span class="whoami-label">phone</span><span class="whoami-value">+34 615 451 338</span></div>
  <div class="whoami-row"><span class="whoami-label">location</span><span class="whoami-value">Venice, Italy</span></div>
  <div class="whoami-row"><span class="whoami-label">linkedin</span><span class="whoami-value"><a href="https://linkedin.com/in/teo-clerici" target="_blank">linkedin.com/in/teo-clerici</a></span></div>
  <div class="whoami-row"><span class="whoami-label">github</span><span class="whoami-value"><a href="https://github.com/teo-clerk" target="_blank">github.com/teo-clerk</a></span></div>
  <div class="whoami-row" style="margin-top:8px;"><span style="color:#aaa; font-size:0.85rem;">Want to send a message now? Type <span class="command-highlight" data-cmd="email">email</span></span></div>
</div><br>`;
            shouldAnimate = false;
        } else if (lowerCmd === 'email') {
            specialAction = () => {
                setTimeout(() => {
                    window.location.href = 'mailto:clerici.teo5@gmail.com';
                }, 1000);
            };
            outputContent = emailText;
            shouldAnimate = false;
        } else if (lowerCmd === 'exit' || lowerCmd === 'quit') {
            outputContent = `<div>This is a browser. There's no escape. Try <span class="command-highlight" data-cmd="clear">clear</span> instead.</div><br>`;
            shouldAnimate = false;
        } else if (lowerCmd === 'ls' || lowerCmd === 'ls -la') {
            outputContent = `<div class="ascii-art" style="font-size:0.85rem;">drwxr-xr-x  about/
drwxr-xr-x  education/
drwxr-xr-x  experience/
drwxr-xr-x  projects/
drwxr-xr-x  skills/
drwxr-xr-x  contact/
-rw-r--r--  CV.pdf
-rwxr-xr-x  game*</div><br>`;
            shouldAnimate = false;
        } else if (lowerCmd === 'pwd') {
            outputContent = `<div>/home/visitor/teoclerici</div><br>`;
            shouldAnimate = false;
        } else if (lowerCmd === 'date') {
            outputContent = `<div>${new Date().toUTCString()}</div><br>`;
            shouldAnimate = false;
        } else if (lowerCmd === 'tars') {
            outputContent = tarsText;
            shouldAnimate = false;
        } else if (lowerCmd === 'randomart') {
            outputContent = getRandomArt();
            shouldAnimate = false;
        } else if (lowerCmd === 'accio' || lowerCmd === 'accio cv' || lowerCmd === 'accio resume') {
            // Summon the CV
            specialAction = () => {
                const a = document.createElement('a');
                a.href = '/CV.pdf';
                a.download = 'Teo_Clerici_CV.pdf';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            };
            outputContent = accioText;
            shouldAnimate = false;
        } else if (lowerCmd === 'avengers' || lowerCmd === 'avengers assemble') {
            outputContent = avengersText;
            shouldAnimate = false;
        } else if (lowerCmd === 'expecto' || lowerCmd === 'expecto patronum') {
            specialAction = () => {
                const flash = document.createElement('div');
                flash.style.position = 'fixed';
                flash.style.top = '0';
                flash.style.left = '0';
                flash.style.width = '100vw';
                flash.style.height = '100vh';
                flash.style.backgroundColor = '#fff';
                flash.style.zIndex = '999999'; // Higher than everything
                flash.style.opacity = '1';
                flash.style.transition = 'opacity 2.5s ease-out';
                flash.style.pointerEvents = 'none';
                document.body.appendChild(flash);
                
                // Force layout reflow so the transition works
                flash.getBoundingClientRect(); 
                flash.style.opacity = '0';
                
                setTimeout(() => document.body.removeChild(flash), 2500);
            };
            outputContent = expectoText;
            shouldAnimate = false;
        } else if (lowerCmd === 'wingardium' || lowerCmd === 'wingardium leviosa') {
            specialAction = () => {
                const app = document.querySelector('.app-container');
                if (app) {
                    app.style.transition = 'transform 2.5s ease-in-out';
                    app.style.transform = 'translateY(-50px)';
                    setTimeout(() => {
                        app.style.transform = 'translateY(0)';
                        setTimeout(() => { 
                            app.style.transition = ''; 
                            app.style.transform = ''; 
                        }, 2500);
                    }, 3500);
                }
            };
            outputContent = wingardiumText;
            shouldAnimate = false;
        } else if (lowerCmd === 'yoda' || lowerCmd === 'master yoda') {
            specialAction = () => {
                const app = document.querySelector('.app-container');
                if (app) {
                    const flash = document.createElement('div');
                    flash.style.position = 'fixed';
                    flash.style.inset = '0';
                    flash.style.boxShadow = 'inset 0 0 150px rgba(0,255,0,0.4)';
                    flash.style.zIndex = '999999';
                    flash.style.pointerEvents = 'none';
                    flash.style.opacity = '1';
                    flash.style.transition = 'opacity 2.5s ease-out';
                    
                    const forceText = document.createElement('div');
                    forceText.textContent = 'FEEL THE FORCE';
                    forceText.style.position = 'fixed';
                    forceText.style.top = '50%';
                    forceText.style.left = '50%';
                    forceText.style.transform = 'translate(-50%, -50%)';
                    forceText.style.color = 'rgba(0, 255, 0, 0.5)';
                    forceText.style.fontSize = '4rem';
                    forceText.style.fontFamily = 'monospace';
                    forceText.style.zIndex = '999999';
                    forceText.style.pointerEvents = 'none';
                    forceText.style.opacity = '1';
                    forceText.style.transition = 'opacity 2.5s ease-out';
                    forceText.style.textShadow = '0 0 20px rgba(0, 255, 0, 0.8)';

                    document.body.appendChild(flash);
                    document.body.appendChild(forceText);
                    playSound('yoda.mp3'); // Try to play lightsaber/force sound

                    setTimeout(() => {
                        flash.style.opacity = '0';
                        forceText.style.opacity = '0';
                        setTimeout(() => { 
                            if(document.body.contains(flash)) document.body.removeChild(flash);
                            if(document.body.contains(forceText)) document.body.removeChild(forceText);
                        }, 2500);
                    }, 500);
                }
            };
            outputContent = yodaText;
            shouldAnimate = false;
        } else if (lowerCmd === 'vader' || lowerCmd === 'darth vader') {
            playSound('imperialmarch.mp3');
            specialAction = () => {
                const app = document.querySelector('.app-container');
                if (app) {
                    app.style.transition = 'transform 2s cubic-bezier(0.4, 0, 0.2, 1)';
                    app.style.transform = 'scale(0.9) translateY(20px)';
                    
                    const flash = document.createElement('div');
                    flash.style.position = 'fixed';
                    flash.style.inset = '0';
                    flash.style.boxShadow = 'inset 0 0 150px rgba(255,0,0,0.5)';
                    flash.style.zIndex = '999999';
                    flash.style.pointerEvents = 'none';
                    flash.style.opacity = '1';
                    flash.style.transition = 'opacity 2.5s ease-out';
                    document.body.appendChild(flash);

                    setTimeout(() => {
                        app.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                        app.style.transform = '';
                        flash.style.opacity = '0';
                        setTimeout(() => { 
                            app.style.transition = ''; 
                            if(document.body.contains(flash)) document.body.removeChild(flash);
                        }, 400);
                    }, 2500);
                }
            };
            outputContent = vaderText;
            shouldAnimate = false;
        } else if (lowerCmd === 'r2d2' || lowerCmd === 'r2-d2') {
            playSound('r2d2.mp3');
            outputContent = r2d2Text;
            shouldAnimate = false;
        } else if (lowerCmd === 'starwars' || lowerCmd === 'star wars') {
            outputContent = starWarsText;
            shouldAnimate = false;
        } else if (lowerCmd === 'may the force' || lowerCmd === 'may the force be with you') {
            outputContent = mayTheForceText;
            shouldAnimate = false;
        } else if (lowerCmd === 'totoro') {
            outputContent = totoroText;
            shouldAnimate = false;
        } else if (lowerCmd === 'ghibli' || lowerCmd === 'studio ghibli') {
            outputContent = ghibliText;
            shouldAnimate = false;
        } else if (lowerCmd === 'spirited' || lowerCmd === 'spirited away' || lowerCmd === 'chihiro') {
            outputContent = spiritedText;
            shouldAnimate = false;
        } else if (lowerCmd === 'spiderman' || lowerCmd === 'spider-man' || lowerCmd === 'peter parker' || lowerCmd === 'miles morales') {
            specialAction = () => {
                const app = document.querySelector('.app-container');
                if (app) {
                    app.style.transition = 'transform 0.08s';
                    app.style.transform = 'scale(1.02) rotate(1.5deg)';
                    
                    const flash = document.createElement('div');
                    flash.style.position = 'fixed';
                    flash.style.inset = '0';
                    flash.style.boxShadow = 'inset 0 0 80px rgba(255,0,0,0.6)';
                    flash.style.zIndex = '999999';
                    flash.style.pointerEvents = 'none';
                    document.body.appendChild(flash);

                    setTimeout(() => {
                        app.style.transform = 'scale(0.98) rotate(-1deg)';
                        flash.style.boxShadow = 'inset 0 0 80px rgba(0,100,255,0.6)';
                        setTimeout(() => {
                            app.style.transform = 'scale(1.01) rotate(0.5deg)';
                            flash.style.boxShadow = 'inset 0 0 80px rgba(255,0,0,0.6)';
                            setTimeout(() => {
                                app.style.transform = '';
                                flash.style.opacity = '0';
                                setTimeout(() => { 
                                    app.style.transition = ''; 
                                    if(document.body.contains(flash)) document.body.removeChild(flash);
                                }, 100);
                            }, 80);
                        }, 80);
                    }, 80);
                }
            };
            outputContent = spiderManText;
            shouldAnimate = false;
        } else if (lowerCmd === 'pascal' || lowerCmd === 'rapunzel' || lowerCmd === 'chameleon' || lowerCmd === 'camaleon') {
            specialAction = () => {
                const themes = ['purple', 'amber']; // green will be the final state
                let count = 0;
                // Pascal changes color like a chameleon!
                const flashInterval = setInterval(() => {
                    applyTheme(themes[Math.floor(Math.random() * themes.length)]);
                    count++;
                    if (count >= 5) {
                        clearInterval(flashInterval);
                        applyTheme('green'); // pascal is green at the end!
                    }
                }, 300);
            };
            outputContent = pascalText;
            shouldAnimate = false;
        } else if (lowerCmd === 'easter eggs' || lowerCmd === 'eastereggs' || lowerCmd === 'easteregg') {
            outputContent = easterEggsText;
            shouldAnimate = false;
        } else if (lowerCmd === 'groot' || lowerCmd === 'i am groot') {
            playSound('groot.mp3');
            outputContent = grootText;
            shouldAnimate = false;
        } else if (lowerCmd === 'guardians' || lowerCmd === 'guardians of the galaxy') {
            playSound('starlord.mp3');
            outputContent = guardiansText;
            shouldAnimate = false;
        } else if (lowerCmd === 'starlord' || lowerCmd === 'star lord' || lowerCmd === 'peter quill') {
            playSound('starlord.mp3');
            outputContent = starlordText;
            shouldAnimate = false;
        } else if (lowerCmd === 'ironman' || lowerCmd === 'iron man' || lowerCmd === 'tony stark') {
            playSound('ironman.mp3');
            outputContent = ironmanText;
            shouldAnimate = false;
        } else if (lowerCmd === 'astrofact') {
            outputContent = getRandomAstrofact();
            shouldAnimate = false;
        } else if (lowerCmd === 'gargantua' || lowerCmd === 'black hole' || lowerCmd === 'interstellar' || lowerCmd === 'cooper') {
            playSound('gargantua.mp3');
            outputContent = gargantuaText;
            shouldAnimate = false;
        } else if (lowerCmd === 'cat') {
            playSound('meow.mp3');
            outputContent = catText;
            shouldAnimate = false;
        } else if (lowerCmd === 'pato' || lowerCmd === 'duck') {
            playSound('quack.mp3');
            outputContent = patoText;
            shouldAnimate = false;
            specialAction = () => playSound('quack.mp3');
        } else if (lowerCmd === 'funfact' || lowerCmd === 'fun fact') {
            outputContent = getRandomFunfact();
            shouldAnimate = false;
        } else if (lowerCmd.startsWith('ask ') || lowerCmd === 'ask') {
            const question = trimmedCmd.replace(/^ask\s*/i, '').trim();
            if (!question) {
                outputContent = `<div>Please provide a question. Usage: <span class="command-highlight" data-cmd="ask who are you?">ask [your question]</span></div><br>`;
                shouldAnimate = false;
            } else {
                // Async handling for AI
                const thinkingId = Date.now() + '-thinking';
                newHistory.push({
                    id: thinkingId,
                    content: `<div style="color:#888;">Thinking...</div><br>`,
                    type: 'output',
                    isAnimated: false
                });
                
                // Immediately update state with "Thinking..."
                setHistory([...newHistory]);
                setCommandHistory(prev => [...prev, trimmedCmd]);
                setHistoryIndex(commandHistory.length + 1);
                setInputVal('');
                setIsTyping(true); // Can't type while thinking
                
                // Fire async AI call
                askGrok(question).then(reply => {
                    setHistory(current => current.map(item => 
                        item.id === thinkingId 
                            ? { ...item, content: `<div><span style="color:var(--accent-color);">■ Grok:</span> ${reply}</div><br>`, isAnimated: true } 
                            : item
                    ));
                    // Re-trigger typing animation for the newly injected text
                    setIsTyping(true);
                });
                
                return; // Exit early since state is already handled async
            }
        } else if (lowerCmd === 'teofetch') {
            outputContent = teofetchText;
            shouldAnimate = false;
        } else if (lowerCmd === 'htop' || lowerCmd === 'top') {
            outputContent = htopText;
            shouldAnimate = false;
        } else if (lowerCmd.startsWith('cowsay ') || lowerCmd === 'cowsay') {
            const msg = trimmedCmd.replace(/^cowsay\s*/i, '').trim() || "Moo";
            const len = msg.length + 2;
            const top = " _" + "_".repeat(len) + "_ ";
            const bot = " -" + "-".repeat(len) + "- ";
            
            outputContent = `<pre class="ascii-art" style="color:#aaa; font-size: 0.8rem;">
${top}
< ${msg} >
${bot}
        \\   ^__^
         \\  (oo)\\_______
            (__)\\       )\\/\\
                ||----w |
                ||     ||</pre><br>`;
            shouldAnimate = false;
        } else if (lowerCmd.startsWith('weather') || lowerCmd === 'weather') {
            const city = trimmedCmd.replace(/^weather\s*/i, '').trim();
            if (!city) {
                outputContent = `<div>Usage: <span class="command-highlight" data-cmd="weather venice">weather [city]</span></div><br>`;
                shouldAnimate = false;
            } else {
                const weatherId = Date.now() + '-weather';
                newHistory.push({
                    id: weatherId,
                    content: `<div style="color:#888;">Fetching weather for ${city}...</div><br>`,
                    type: 'output',
                    isAnimated: false
                });
                
                setHistory([...newHistory]);
                setCommandHistory(prev => [...prev, trimmedCmd]);
                setHistoryIndex(commandHistory.length + 1);
                setInputVal('');
                setIsTyping(true);
                
                fetch(`https://wttr.in/${city}?format=3`)
                    .then(res => {
                        if (!res.ok) throw new Error("Network/CORS error");
                        return res.text();
                    })
                    .catch(() => {
                        // Fallback to proxy if wttr.in gives CORS error or 503
                        return fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(`https://wttr.in/${city}?format=3`)}`)
                            .then(res => {
                                if (!res.ok) throw new Error("Proxy error");
                                return res.text();
                            });
                    })
                    .then(text => {
                        if (!text || text.includes('Unknown location')) throw new Error("Not found");
                        setHistory(current => current.map(item => 
                            item.id === weatherId 
                                ? { ...item, content: `<div style="color:#ddd;">☁️ ${text}</div><br>`, isAnimated: true } 
                                : item
                        ));
                        setIsTyping(true);
                    }).catch(err => {
                        setHistory(current => current.map(item => 
                            item.id === weatherId 
                                ? { ...item, content: `<div style="color:#ff5f56;">Failed to fetch weather for "${city}".</div><br>`, isAnimated: true } 
                                : item
                        ));
                        setIsTyping(true);
                    });
                return;
            }
        } else if (lowerCmd.startsWith('volume') || lowerCmd === 'volume') {
            const val = trimmedCmd.replace(/^volume\s*/i, '').trim();
            if (!val) {
                outputContent = `<div>Current volume: ${Math.round(globalVolume * 100)}%</div><br>`;
            } else {
                const num = parseInt(val, 10);
                if (isNaN(num) || num < 0 || num > 100) {
                    outputContent = `<div style="color:#ff5f56;">Invalid volume. Usage: <span class="command-highlight" data-cmd="volume 75">volume [0-100]</span></div><br>`;
                } else {
                    const newVol = num / 100;
                    setGlobalVolume(newVol);
                    outputContent = `<div>Volume set to ${num}%</div><br>`;
                }
            }
            shouldAnimate = false;
        } else if (lowerCmd === 'lofi') {
            const isPlaying = toggleLoopingSound('lofi.mp3');
            outputContent = `<div>🎧 Lofi Hip Hop Radio - ${isPlaying ? '<span style="color:#0f0;">PLAYING</span>' : '<span style="color:#f00;">STOPPED</span>'}</div><br>`;
            shouldAnimate = false;
        } else if (lowerCmd === 'rain') {
            const isPlaying = toggleLoopingSound('rain.mp3');
            outputContent = `<div>🌧️ Rain Simulator - ${isPlaying ? '<span style="color:#0f0;">PLAYING</span>' : '<span style="color:#f00;">STOPPED</span>'}</div><br>`;
            shouldAnimate = false;
        } else if (lowerCmd === 'hack') {
            outputContent = `<div style="color:#0f0;">Initiating override sequence...</div>`;
            shouldAnimate = false;
            
            specialAction = () => {
                let count = 0;
                const hackInterval = setInterval(() => {
                    const randomHex = [...Array(40)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
                    setHistory(prev => [
                        ...prev, 
                        {
                            id: Date.now() + '-hack-' + count,
                            content: `<div style="color:var(--accent-color); opacity: 0.7;">[${count}] ${randomHex}</div>`,
                            type: 'output',
                            isAnimated: false
                        }
                    ]);
                    count++;
                    
                    if (count > 20) {
                        clearInterval(hackInterval);
                        setTimeout(() => {
                            setHistory(prev => [
                                ...prev,
                                {
                                    id: Date.now() + '-hack-success',
                                    content: `<div style="color:#ff5f56; font-size: 1.5rem; font-weight: bold; margin-top:10px;">> MAINFRAME ACCESS GRANTED</div><br>`,
                                    type: 'output',
                                    isAnimated: true
                                }
                            ]);
                            setIsTyping(true);
                        }, 500);
                    }
                }, 50);
            };
        } else if (lowerCmd === 'snake') {
            outputContent = snakeText;
            shouldAnimate = false;
        } else if (lowerCmd === 'history') {
            const histLines = commandHistory.map((c, i) => `  ${i + 1}  ${c}`).join('<br>');
            outputContent = `<div>${histLines || 'No history yet.'}</div><br>`;
            shouldAnimate = false;
        } else if (lowerCmd === 'map') {
            outputContent = `
<div style="width: 100%; height: 300px; border-radius: 8px; overflow: hidden; margin-top: 10px; box-shadow: 0 0 15px var(--accent-color);">
  <iframe width="100%" height="100%" frameborder="0" scrolling="no" marginheight="0" marginwidth="0" src="https://www.openstreetmap.org/export/embed.html?bbox=12.190000915527346%2C45.35000000000001%2C12.450000076293947%2C45.520000000000004&amp;layer=mapnik&amp;marker=45.4343%2C12.3388" style="background:#000; filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%);"></iframe>
</div>
<br><div style="color:#aaa;">Location: Venice, Italy 🌍</div><br>`;
            shouldAnimate = false;
        } else if (lowerCmd.startsWith('lang ') || lowerCmd === 'lang') {
            const lang = trimmedCmd.replace(/^lang\s*/i, '').trim().toLowerCase();
            if (!lang) {
                outputContent = `<div>Usage: <span class="command-highlight" data-cmd="lang es">lang [es/it/en/ca]</span></div><br>`;
            } else if (lang === 'en') {
                outputContent = `<div>English mode activated. (It already was!) 🇬🇧</div><br>`;
            } else if (lang === 'es') {
                outputContent = `<div>¡Modo español activado! (Traducción completa del CV en v3.0) 🇪🇸</div><br>`;
            } else if (lang === 'it') {
                outputContent = `<div>Modalità italiana attivata! (Traduzione completa del CV in v3.0) 🇮🇹</div><br>`;
            } else if (lang === 'ca') {
                outputContent = `<div>Mode català activat! (Traducció completa del CV a la v3.0) ✨</div><br>`;
            } else {
                outputContent = `<div>Language '${lang}' not fully supported yet. I speak English, Spanish, Italian, and Catalan!</div><br>`;
            }
            shouldAnimate = false;
        } else if (cvData[lowerCmd]) {
            outputContent = cvData[lowerCmd];
        } else {
            outputContent = `<div>Command not found: <span class="command-highlight" data-cmd="help">${trimmedCmd}</span>. Type 'help' for available commands.</div><br>`;
            shouldAnimate = false;
        }

        if (specialAction) specialAction();

        newHistory.push({
            id: Date.now() + '-out',
            content: outputContent,
            type: 'output',
            isAnimated: shouldAnimate
        });

        setHistory(newHistory);
        setCommandHistory(prev => [...prev, trimmedCmd]);
        setHistoryIndex(commandHistory.length + 1);
        setInputVal('');
        if (shouldAnimate) setIsTyping(true);
    };

    const handleKeyDown = (e) => {
        if (isTyping) {
            e.preventDefault();
            const activeLine = document.querySelector('.output-line:last-child');
            if (activeLine) activeLine.click(); 
            return;
        }

        if (e.key === 'Enter') {
            runCommand(inputVal);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (historyIndex > 0) {
                const newIndex = historyIndex - 1;
                setHistoryIndex(newIndex);
                setInputVal(commandHistory[newIndex]);
            } else if (historyIndex === -1 && commandHistory.length > 0) {
                const newIndex = commandHistory.length - 1;
                setHistoryIndex(newIndex);
                setInputVal(commandHistory[newIndex]);
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (historyIndex < commandHistory.length - 1) {
                const newIndex = historyIndex + 1;
                setHistoryIndex(newIndex);
                setInputVal(commandHistory[newIndex]);
            } else {
                setHistoryIndex(commandHistory.length);
                setInputVal('');
            }
        } else if (e.key === 'Tab') {
            e.preventDefault();
            if (inputVal) {
                const match = commandsList.find(c => c.startsWith(inputVal));
                if (match) setInputVal(match);
            }
        }
    };

    return {
        history,
        inputVal,
        setInputVal,
        isTyping,
        setIsTyping,
        inputRef,
        terminalBodyRef,
        handleKeyDown,
        runCommand,
        showGame,
        setShowGame,
        showMatrix,
        setShowMatrix,
        showBoot,
        setShowBoot,
    };
};
