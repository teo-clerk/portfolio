import { useState, useEffect, useRef, useCallback } from 'react';

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

// Previously the accumulated delay was ~2.8s plus a 600ms hold and a 500ms
// fade — roughly 3.9s before a first-time visitor could type anything. These
// values bring the whole sequence in at ~1.2s while keeping the effect.
const FIRST_DELAY = 80;
const FAST_STEP = 90;
const SLOW_STEP = 130;
const FAST_LINES = 3;
const HOLD_MS = 260;
const FADE_MS = 320;

/**
 * Should the boot animation be skipped entirely?
 *
 * A visitor arriving from a CV link or a job application is the last person who
 * should be made to watch a loading animation, so tagged inbound traffic goes
 * straight to the terminal — as do reduced-motion and Save-Data users.
 */
const shouldSkipBoot = () => {
    try {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
        if (navigator.connection?.saveData) return true;
        const params = new URLSearchParams(window.location.search);
        if (params.has('utm_source') || params.has('ref') || params.has('cmd')) return true;
    } catch {
        /* URL or matchMedia unavailable — fall through and play the animation */
    }
    return false;
};

const BootSequence = ({ onComplete }) => {
    // Decided once at mount so the skip path never has to set state from an
    // effect — the initial state simply is the finished state.
    const [autoSkip] = useState(shouldSkipBoot);
    const [lines, setLines] = useState(() => (autoSkip ? BOOT_LINES : []));
    const [done, setDone] = useState(autoSkip);
    const skipped = useRef(autoSkip);
    const timeouts = useRef([]);

    // Held in a ref so the mount-only effect never needs onComplete as a dep.
    const onCompleteRef = useRef(onComplete);
    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    const finish = useCallback(() => {
        setDone(true);
        const t = setTimeout(() => onCompleteRef.current?.(), FADE_MS);
        timeouts.current.push(t);
    }, []);

    const skip = useCallback(() => {
        if (skipped.current) return;
        skipped.current = true;
        timeouts.current.forEach(clearTimeout);
        timeouts.current = [];
        setLines(BOOT_LINES);
        const t = setTimeout(finish, 120);
        timeouts.current.push(t);
    }, [finish]);

    useEffect(() => {
        if (autoSkip) {
            onCompleteRef.current?.();
            return;
        }

        let delay = FIRST_DELAY;
        BOOT_LINES.forEach((line, i) => {
            const t = setTimeout(() => {
                if (skipped.current) return;
                setLines((prev) => [...prev, line]);
                if (i === BOOT_LINES.length - 1) {
                    const finalT = setTimeout(finish, HOLD_MS);
                    timeouts.current.push(finalT);
                }
            }, delay);
            timeouts.current.push(t);
            delay += i < FAST_LINES ? FAST_STEP : SLOW_STEP;
        });

        const handleKey = () => skip();
        window.addEventListener('keydown', handleKey);
        window.addEventListener('click', handleKey);
        window.addEventListener('touchstart', handleKey);

        // Copy the ref value: by cleanup time `timeouts.current` may point at a
        // different array (skip() replaces it).
        const pending = timeouts.current;
        return () => {
            pending.forEach(clearTimeout);
            window.removeEventListener('keydown', handleKey);
            window.removeEventListener('click', handleKey);
            window.removeEventListener('touchstart', handleKey);
        };
    }, [autoSkip, skip, finish]);

    return (
        <div
            className={`boot-sequence${done ? ' boot-fade-out' : ''}`}
            role="status"
            aria-live="polite"
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 1000,
                backgroundColor: '#000',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                padding: 'clamp(1.5rem, 8vw, 15vw)',
                fontFamily: "'Fira Code', monospace",
                fontSize: 'clamp(0.7rem, 2.6vw, 0.9rem)',
                color: '#27c93f',
                opacity: done ? 0 : 1,
                transition: `opacity ${FADE_MS}ms ease`,
                pointerEvents: done ? 'none' : 'all',
                userSelect: 'none',
            }}
        >
            {/* Surfaced immediately rather than after the lines render. */}
            {!done && (
                <div style={{ marginBottom: '18px', color: '#8f8', fontSize: '0.8rem', letterSpacing: '0.05em' }}>
                    press any key to skip_
                </div>
            )}

            {lines.map((line, i) => (
                <div key={i} style={{
                    marginBottom: '6px',
                    textShadow: '0 0 6px #27c93f',
                    animation: 'bootLineFadeIn 0.2s ease',
                }}>
                    {line}
                </div>
            ))}
        </div>
    );
};

export default BootSequence;
