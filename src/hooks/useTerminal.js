import { useState, useEffect, useRef } from 'react';
import {
    cvData, asciiArt, asciiArtMobile, asciiArtFull, commandsList
} from '../data/cvData';
import { commandExecutors, dynamicCommandExecutors } from './commandExecutors';

const THEMES = {
    purple: { accent: '#8A2BE2', bg: 'rgba(20, 20, 20, 0.5)' },
    green:  { accent: '#27c93f', bg: 'rgba(0, 20, 5, 0.55)' },
    amber:  { accent: '#ffbd2e', bg: 'rgba(20, 15, 0, 0.55)' },
    spiderman: { accent: '#ff0000', bg: 'rgba(0, 20, 50, 0.75)' },
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
    const [showDoom, setShowDoom] = useState(false);
    const [showBoot, setShowBoot] = useState(true);
    const [isTyping, setIsTyping] = useState(false);
    const [globalVolume, setGlobalVolume] = useState(0.75);
    const [tourQueue, setTourQueue] = useState([]);
    
    const inputRef = useRef(null);
    const terminalBodyRef = useRef(null);
    const audioRefs = useRef({});

    const getAsciiArt = () => {
        if (window.innerWidth > 1200) return asciiArtFull;
        if (window.innerWidth > 768) return asciiArt;
        return asciiArtMobile;
    };

    const playSound = (soundFileName) => {
        try {
            const audio = new Audio(`/sounds/${soundFileName}`);
            audio.volume = globalVolume;
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

    useEffect(() => {
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

    // Handle automated tour execution
    useEffect(() => {
        if (!isTyping && tourQueue.length > 0) {
            const nextCmd = tourQueue[0];
            const timeout = setTimeout(() => {
                setTourQueue(prev => prev.slice(1));
                runCommand(nextCmd);
            }, 1000);
            return () => clearTimeout(timeout);
        }
    }, [isTyping, tourQueue]);

    const runCommand = (cmd) => {
        if (isTyping) return;
        
        const trimmedCmd = cmd.trim();
        if (!trimmedCmd) return;

        const newHistory = [...history];
        
        newHistory.push({
            id: Date.now() + '-cmd',
            content: `<div class="input-line"><span class="prompt">visitor@teoclerici:~$</span> <span>${trimmedCmd}</span></div>`,
            type: 'command',
            isAnimated: false
        });

        const lowerCmd = trimmedCmd.toLowerCase();
        
        // Command context passed to executors
        const ctx = {
            cmd: trimmedCmd, newHistory, history, 
            setHistory, setInputVal, setShowGame, setShowMatrix, setShowDoom, applyTheme,
            globalVolume, setGlobalVolume, playSound, toggleLoopingSound, setIsTyping,
            commandHistory, setCommandHistory, setHistoryIndex, setTourQueue
        };

        let result = null;

        // Pattern matching for exact commands
        if (commandExecutors[lowerCmd]) {
            result = commandExecutors[lowerCmd](ctx);
        } else {
            // Pattern matching for dynamic commands (e.g. startsWith)
            const dynamicExecutor = dynamicCommandExecutors.find(e => e.match(lowerCmd));
            if (dynamicExecutor) {
                result = dynamicExecutor.execute(trimmedCmd, ctx);
            }
        }

        if (result && result.earlyReturn) return;

        let outputContent = result ? result.outputContent : '';
        let shouldAnimate = result && result.shouldAnimate !== undefined ? result.shouldAnimate : true;
        let specialAction = result ? result.specialAction : null;

        if (!result && cvData[lowerCmd]) {
            outputContent = cvData[lowerCmd];
        } else if (!result) {
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
                const match = commandsList.find(c => c.startsWith(inputVal.toLowerCase()));
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
        showDoom,
        setShowDoom,
        showBoot,
        setShowBoot,
    };
};
