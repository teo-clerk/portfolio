import { useState, useEffect, useRef } from 'react';
import { cvData, helpText, asciiArt, asciiArtMobile, asciiArtFull, commandsList } from '../data/cvData';
import { useTypewriter } from './useTypewriter';

export const useTerminal = () => {
    const [history, setHistory] = useState([]);
    const [inputVal, setInputVal] = useState('');
    const [commandHistory, setCommandHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    
    const inputRef = useRef(null);
    const terminalBodyRef = useRef(null);

    // Determine which ASCII art to show based on screen width
    const getAsciiArt = () => {
        if (window.innerWidth > 1200) return asciiArtFull;
        if (window.innerWidth > 768) return asciiArt;
        return asciiArtMobile;
    };

    const [isTyping, setIsTyping] = useState(false);

    // Initial greeting
    // Initial greeting
    useEffect(() => {
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

        if (lowerCmd === 'clear') {
            setHistory([]);
            setInputVal('');
            return;
        } else if (lowerCmd === 'help') {
            outputContent = helpText;
        } else if (cvData[lowerCmd]) {
            outputContent = cvData[lowerCmd];
        } else {
            outputContent = `<div>Command not found: <span class="command-highlight" data-cmd="help">${trimmedCmd}</span>. Type 'help' for available commands.</div><br>`;
        }

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
        setIsTyping(true);
    };

    const handleKeyDown = (e) => {
        if (isTyping) {
            e.preventDefault();
            // Trigger skip on active typewriter
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
        runCommand
    };
};
