import { useState, useEffect, useRef } from 'react';
import { asciiArt, asciiArtMobile, asciiArtFull } from '../data/cvData';
import { resolveCommand, commandsList } from '../commands/registry';
import { resolveDeepLink } from '../commands/deepLink';
import { escapeHtml } from '../utils/escapeHtml';
import { readStorage, writeStorage } from '../utils/storage';
import { getTheme } from '../utils/themes';

const THEME_STORAGE_KEY = 'theme';

/**
 * Keys that mean "show me the rest now" while output is still being typed out:
 * any printable character, Enter or Escape. Modifier chords (Ctrl/Cmd+K opens
 * the palette), Tab and the arrow keys are left alone.
 */
const isSkipKey = (e) =>
    !e.ctrlKey && !e.metaKey && !e.altKey
    && (e.key.length === 1 || e.key === 'Enter' || e.key === 'Escape');

const paintTheme = (name, theme) => {
    document.documentElement.setAttribute('data-theme', name);
    document.documentElement.style.setProperty('--accent-color', theme.accent);
    document.documentElement.style.setProperty('--terminal-bg', theme.bg);
};

/**
 * Apply a theme, persist it, and cross-fade the swap where supported.
 *
 * `startViewTransition` is progressive enhancement: unsupported browsers (and
 * anyone who asked for reduced motion) take the plain synchronous path. The
 * boolean return is what `theme <name>` uses to decide between the success and
 * "unknown theme" output, so it must stay synchronous — `startViewTransition`
 * returns immediately and commits the DOM write in a callback, which is fine.
 *
 * Persistence deliberately stores only the theme NAME. THEMES (utils/themes.js)
 * and the `[data-theme]` blocks in index.css already have to agree; resolving colours
 * from a third copy (say, an inline hydration script) would be a third place to
 * drift. Hydration therefore happens on mount, below, not before first paint.
 */
const applyTheme = (name) => {
    // getTheme looks the name up in a Map, so prototype keys such as
    // "constructor" are unknown themes rather than truthy junk.
    const theme = getTheme(name);
    if (!theme) return false;

    const commit = () => paintTheme(name, theme);
    writeStorage('localStorage', THEME_STORAGE_KEY, name);

    let reduced = false;
    try {
        reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
        /* matchMedia unavailable — treat as "motion is fine" */
    }

    if (!reduced && typeof document.startViewTransition === 'function') {
        try {
            document.startViewTransition(commit);
            return true;
        } catch {
            /* transition refused (already running, document hidden) — fall through */
        }
    }

    commit();
    return true;
};

/**
 * @param {{
 *   initialCommand?: string | null,
 *   onUndock?: () => void,
 * }} [options]
 *   `initialCommand` runs once the welcome message has finished: a `?cmd=`
 *   deep link, or the shortcut chosen on the orbit landing. `onUndock` is what
 *   `exit` calls to leave the terminal for the landing.
 */
export const useTerminal = ({ initialCommand = null, onUndock } = {}) => {
    const [history, setHistory] = useState([]);
    const [inputVal, setInputVal] = useState('');
    const [commandHistory, setCommandHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [showGame, setShowGame] = useState(false);
    const [showMatrix, setShowMatrix] = useState(false);
    const [showDoom, setShowDoom] = useState(false);
    const [showSnake, setShowSnake] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [globalVolume, setGlobalVolume] = useState(0.75);
    // Commands waiting to run one after another: the `tour`, and the command
    // to run on arrival (a `?cmd=recruiter` deep link, or the shortcut picked
    // on the orbit landing; App.jsx decides which). Going through this queue
    // rather than calling runCommand directly means the arrival command waits
    // for the welcome typewriter instead of racing it.
    //
    // A link is written by someone other than the visitor, so the command is
    // untrusted: resolveDeepLink only lets through commands that print CV
    // content (plus help/tour/recruiter). Anything else is ignored.
    const [tourQueue, setTourQueue] = useState(() => {
        const arrivalCommand = resolveDeepLink(initialCommand);
        return arrivalCommand ? [arrivalCommand] : [];
    });
    
    const inputRef = useRef(null);
    const terminalBodyRef = useRef(null);
    const audioRefs = useRef({});

    // Mirror of globalVolume. playSound is captured by the mount-only konami
    // listener, which otherwise pins volume at its initial value forever.
    const volumeRef = useRef(globalVolume);

    // Latest runCommand, for callers that must not re-subscribe when it changes.
    const runCommandRef = useRef(null);
    useEffect(() => {
        volumeRef.current = globalVolume;
    }, [globalVolume]);

    const getAsciiArt = () => {
        if (window.innerWidth > 1200) return asciiArtFull;
        if (window.innerWidth > 768) return asciiArt;
        return asciiArtMobile;
    };

    const playSound = (soundFileName) => {
        try {
            const audio = new Audio(`/sounds/${soundFileName}`);
            audio.volume = volumeRef.current;
            audio.play().catch(e => console.warn('Audio playback prevented by browser', e));
        } catch (error) {
            console.error('Failed to play sound', error);
        }
    };

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
                audio.volume = volumeRef.current;
                audio.play().catch(e => console.warn('Audio playback prevented by browser', e));
                audioRefs.current[soundName] = audio;
                return true;
            }
        } catch (error) {
            console.error('Failed to toggle sound', error);
            return false;
        }
    };

    useEffect(() => {
        // Rehydrate the last chosen theme. Runs after first paint, so an
        // unsupported/blocked storage read simply leaves the CSS default in
        // place rather than throwing.
        const storedTheme = readStorage('localStorage', THEME_STORAGE_KEY);
        const storedThemeColors = getTheme(storedTheme);
        if (storedThemeColors) {
            paintTheme(storedTheme, storedThemeColors);
        }

        const art = getAsciiArt();
        const welcomeMessage = `<div style="color:var(--accent-color); margin-top: 15px; font-weight: bold;">TeoOS v20.26 (H-Farm Edition)</div><div style="color:#aaa; margin-top: 5px;">Welcome to the interactive terminal. Type <span class="command-highlight" data-cmd="help">help</span> to see all commands.</div><div style="margin-top: 12px; font-size: 0.9rem; color: #888;">Quick Start:</div><div style="display: flex; gap: 12px; margin-top: 6px;"><span class="command-highlight" data-cmd="about">#about</span> <span class="command-highlight" data-cmd="floodfusion">#floodfusion</span> <span class="command-highlight" data-cmd="projects">#projects</span> <span class="command-highlight" data-cmd="tour">#tour</span></div><br>`;
        setHistory([{ 
            id: 'init', 
            content: art + welcomeMessage, 
            type: 'output', 
            isAnimated: true 
        }]);

        const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
        let konamiIndex = 0;

        const handleKeyDownKonami = (e) => {
            if (e.key === konamiCode[konamiIndex]) {
                konamiIndex++;
                if (konamiIndex === konamiCode.length) {
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

        window.addEventListener('keydown', handleKeyDownKonami);
        return () => window.removeEventListener('keydown', handleKeyDownKonami);
    }, []);

    useEffect(() => {
        if (terminalBodyRef.current) {
            terminalBodyRef.current.scrollTop = terminalBodyRef.current.scrollHeight;
        }
    }, [history, isTyping]);

    useEffect(() => {
        Object.values(audioRefs.current).forEach(audio => {
            if (audio) {
                audio.volume = globalVolume;
            }
        });
    }, [globalVolume]);

    // Looping ambience (lofi / rain) outlived the component, so it kept
    // playing after unmount with no handle left to stop it.
    useEffect(() => {
        const audios = audioRefs.current;
        return () => {
            Object.values(audios).forEach(audio => {
                try {
                    audio?.pause();
                } catch {
                    /* element already torn down */
                }
            });
            Object.keys(audios).forEach(key => delete audios[key]);
        };
    }, []);

    // Handle automated tour execution.
    // runCommand is re-created every render, so it is read through a ref here:
    // listing it as a dependency would restart the tour timer on every render,
    // and omitting it outright would capture a stale closure.
    useEffect(() => {
        if (isTyping || tourQueue.length === 0) return;

        const nextCmd = tourQueue[0];
        const timeout = setTimeout(() => {
            setTourQueue(prev => prev.slice(1));
            runCommandRef.current?.(nextCmd);
        }, 1000);
        return () => clearTimeout(timeout);
    }, [isTyping, tourQueue]);

    const runCommand = (cmd) => {
        if (isTyping) return;
        
        const trimmedCmd = cmd.trim();
        if (!trimmedCmd) return;

        const newHistory = [...history];
        
        newHistory.push({
            id: Date.now() + '-cmd',
            content: `<div class="input-line"><span class="prompt">visitor@teoclerici:~$</span> <span>${escapeHtml(trimmedCmd)}</span></div>`,
            type: 'command',
            isAnimated: false
        });

        const lowerCmd = trimmedCmd.toLowerCase();
        
        // Command context passed to executors
        const ctx = {
            cmd: trimmedCmd, newHistory, history, 
            setHistory, setInputVal, setShowGame, setShowMatrix, setShowDoom, setShowSnake, applyTheme,
            globalVolume, setGlobalVolume, playSound, toggleLoopingSound, setIsTyping,
            commandHistory, setCommandHistory, setHistoryIndex, setTourQueue, onUndock
        };

        // Exact match, then pattern match. CV content commands are ordinary
        // registry entries now, so there is no cvData fallback to consult.
        const resolved = resolveCommand(lowerCmd);
        const result = resolved
            ? (resolved.isDynamic
                ? resolved.command.runDynamic(trimmedCmd, ctx)
                : resolved.command.run(ctx))
            : null;

        if (result && result.earlyReturn) return;

        let outputContent = result ? result.outputContent : '';
        let shouldAnimate = result && result.shouldAnimate !== undefined ? result.shouldAnimate : true;
        const specialAction = result ? result.specialAction : null;

        if (!result) {
            outputContent = `<div>Command not found: <span class="command-highlight" data-cmd="help">${escapeHtml(trimmedCmd)}</span>. Type 'help' for available commands.</div><br>`;
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

    // Finish the line that is currently being typed out. OutputLine skips on
    // click, so this clicks the newest line. (The old selector,
    // `.output-line:last-child`, never matched: the last child of the terminal
    // body is the input row.)
    const skipTypewriter = () => {
        const lines = terminalBodyRef.current?.querySelectorAll('.output-line');
        lines?.[lines.length - 1]?.click();
    };

    // The input stays enabled while output is typing. It used to be `disabled`,
    // which dropped focus on every command (closing the on-screen keyboard on
    // phones) and meant no key event could ever reach the skip logic below.
    const handleInputChange = (e) => {
        if (isTyping) {
            // On-screen keyboards report most keys as "Unidentified", so the
            // keydown path below cannot see them; the change event can.
            skipTypewriter();
            return;
        }
        setInputVal(e.target.value);
    };

    const handleKeyDown = (e) => {
        if (isTyping) {
            if (isSkipKey(e)) {
                e.preventDefault();
                skipTypewriter();
            }
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
                const match = commandsList.find(c => c.startsWith(inputVal.toLowerCase()));
                if (match) setInputVal(match);
            }
        }
    };

    useEffect(() => {
        runCommandRef.current = runCommand;
    });

    return {
        history,
        inputVal,
        setInputVal,
        isTyping,
        setIsTyping,
        inputRef,
        terminalBodyRef,
        handleKeyDown,
        handleInputChange,
        runCommand,
        showGame,
        setShowGame,
        showMatrix,
        setShowMatrix,
        showDoom,
        setShowDoom,
        showSnake,
        setShowSnake,
    };
};
