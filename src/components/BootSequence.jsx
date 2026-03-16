import React, { useState, useEffect, useRef } from 'react';

const BOOT_LINES = [
    'BIOS v2.4.1  Copyright (C) 2025 TeoCorp Systems',
    'CPU: Intel Core i9-13900K @ 5.8GHz  [OK]',
    'Memory: 64GB DDR5-6400  [OK]',
    'Initializing kernel modules...',
    'Loading personality.sh  [        ] 0%',
    'Loading personality.sh  [████████] 100%  [OK]',
    'Checking clearance level... Gryffindor-tier access granted  [OK]',
    'Starting J.A.R.V.I.S. compatibility layer  [OK]',
    'Mounting /home/teo/portfolio  [OK]',
    'Starting interactive shell...',
];

const BootSequence = ({ onComplete }) => {
    const [lines, setLines] = useState([]);
    const [done, setDone] = useState(false);
    const skipped = useRef(false);
    const timeouts = useRef([]);

    const skip = () => {
        if (skipped.current) return;
        skipped.current = true;
        timeouts.current.forEach(clearTimeout);
        setLines(BOOT_LINES);
        setTimeout(() => {
            setDone(true);
            setTimeout(onComplete, 400);
        }, 300);
    };

    useEffect(() => {
        let delay = 120;
        BOOT_LINES.forEach((line, i) => {
            const t = setTimeout(() => {
                if (skipped.current) return;
                setLines(prev => [...prev, line]);
                if (i === BOOT_LINES.length - 1) {
                    const finalT = setTimeout(() => {
                        setDone(true);
                        setTimeout(onComplete, 500);
                    }, 600);
                    timeouts.current.push(finalT);
                }
            }, delay);
            timeouts.current.push(t);
            delay += i < 3 ? 200 : 350;
        });

        const handleKey = () => skip();
        window.addEventListener('keydown', handleKey);
        window.addEventListener('click', handleKey);
        return () => {
            timeouts.current.forEach(clearTimeout);
            window.removeEventListener('keydown', handleKey);
            window.removeEventListener('click', handleKey);
        };
    }, []);

    return (
        <div
            className={`boot-sequence${done ? ' boot-fade-out' : ''}`}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 1000,
                backgroundColor: '#000',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                padding: '15vw',
                fontFamily: "'Fira Code', monospace",
                fontSize: '0.9rem',
                color: '#27c93f',
                opacity: done ? 0 : 1,
                transition: 'opacity 0.5s ease',
                pointerEvents: done ? 'none' : 'all',
                userSelect: 'none',
            }}
        >
            {lines.map((line, i) => (
                <div key={i} style={{
                    marginBottom: '6px',
                    textShadow: '0 0 6px #27c93f',
                    animation: 'bootLineFadeIn 0.2s ease',
                }}>
                    {line}
                </div>
            ))}
            {!done && (
                <div style={{ marginTop: '24px', color: '#555', fontSize: '0.75rem' }}>
                    press any key to skip_
                </div>
            )}
        </div>
    );
};

export default BootSequence;
