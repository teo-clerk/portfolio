import { useState, useEffect, useRef } from 'react';
import {
    cvData, helpText, asciiArt, asciiArtMobile, asciiArtFull, commandsList,
    whoamiText, getRandomFortune, themeText, interstellarText, tarsText,
    accioText, avengersText, expectoText, wingardiumText,
    yodaText, vaderText, r2d2Text, starWarsText, mayTheForceText,
    totoroText, ghibliText, spiritedText, spiderManText, getRandomFunfact,
    pascalText, easterEggsText, grootText, ironmanText, catText, patoText, getRandomAstrofact,
    guardiansText, starlordText
} from '../data/cvData';
// Upgraded art pool (separate file to avoid backtick nesting issues)
import { getRandomArt } from '../data/randomArt';

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
            audio.play().catch(e => console.warn('Audio playback prevented by browser', e));
        } catch (error) {
            console.error('Failed to play sound', error);
        }
    };

    // Initial greeting
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
    }, []);

    // Auto-scroll
    useEffect(() => {
        if (terminalBodyRef.current) {
            terminalBodyRef.current.scrollTop = terminalBodyRef.current.scrollHeight;
        }
    }, [history, isTyping]);

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
        } else if (lowerCmd === 'interstellar' || lowerCmd === 'cooper') {
            outputContent = interstellarText;
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
            outputContent = grootText;
            shouldAnimate = false;
            specialAction = () => playSound('groot.mp3');
        } else if (lowerCmd === 'guardians' || lowerCmd === 'guardians of the galaxy') {
            outputContent = guardiansText;
            shouldAnimate = false;
        } else if (lowerCmd === 'starlord' || lowerCmd === 'star lord' || lowerCmd === 'peter quill') {
            outputContent = starlordText;
            shouldAnimate = false;
        } else if (lowerCmd === 'ironman' || lowerCmd === 'iron man' || lowerCmd === 'tony stark') {
            outputContent = ironmanText;
            shouldAnimate = false;
            specialAction = () => playSound('ironman.mp3');
        } else if (lowerCmd === 'astrofact') {
            outputContent = getRandomAstrofact();
            shouldAnimate = false;
        } else if (lowerCmd === 'cat') {
            outputContent = catText;
            shouldAnimate = false;
            specialAction = () => playSound('meow.mp3');
        } else if (lowerCmd === 'pato' || lowerCmd === 'duck') {
            outputContent = patoText;
            shouldAnimate = false;
            specialAction = () => playSound('quack.mp3');
        } else if (lowerCmd === 'funfact' || lowerCmd === 'fun fact') {
            outputContent = getRandomFunfact();
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
