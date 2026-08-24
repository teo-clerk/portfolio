import { useEffect, useRef } from 'react';

// Custom cursor — only on non-touch devices
const isTouchDevice = () =>
    typeof window !== 'undefined' &&
    (window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window);

// Below this distance the ring has effectively caught up with the pointer and
// the loop can stop entirely instead of burning a frame forever.
const SETTLE_EPSILON = 0.1;

const CustomCursor = () => {
    const dotRef = useRef(null);
    const ringRef = useRef(null);
    const pos = useRef({ x: -200, y: -200 });
    const ring = useRef({ x: -200, y: -200 });
    const raf = useRef(0);
    const isVisible = useRef(false);

    useEffect(() => {
        if (isTouchDevice()) return;

        const dot = dotRef.current;
        const ringEl = ringRef.current;
        if (!dot || !ringEl) return;

        // Only hide the native cursor once our replacement is actually mounted.
        // If this chunk never loads, the native cursor stays — see index.css.
        document.body.classList.add('cursor-ready');

        let yOffset = 0;
        let magicTimeout;

        const tick = () => {
            const targetY = pos.current.y + yOffset;
            const dx = pos.current.x - ring.current.x;
            const dy = targetY - ring.current.y;

            ring.current.x += dx * 0.12;
            ring.current.y += dy * 0.12;

            dot.style.transform = `translate3d(${pos.current.x}px, ${targetY}px, 0) translate(-50%, -50%)`;
            ringEl.style.transform = `translate3d(${ring.current.x}px, ${ring.current.y}px, 0) translate(-50%, -50%) scale(var(--ring-scale, 1))`;

            // Idle out rather than scheduling frames forever.
            if (Math.abs(dx) < SETTLE_EPSILON && Math.abs(dy) < SETTLE_EPSILON) {
                raf.current = 0;
                return;
            }
            raf.current = requestAnimationFrame(tick);
        };

        const wake = () => {
            if (!raf.current) raf.current = requestAnimationFrame(tick);
        };

        const onMove = (e) => {
            pos.current = { x: e.clientX, y: e.clientY };
            if (!isVisible.current) {
                isVisible.current = true;
                dot.style.opacity = '1';
                ringEl.style.opacity = '1';
            }
            wake();
        };

        const onLeave = () => {
            isVisible.current = false;
            dot.style.opacity = '0';
            ringEl.style.opacity = '0';
        };

        const onClick = () => {
            ringEl.style.setProperty('--ring-scale', '1.8');
            ringEl.style.opacity = '0.2';
            setTimeout(() => {
                ringEl.style.setProperty('--ring-scale', '1');
                ringEl.style.opacity = isVisible.current ? '1' : '0';
            }, 200);
        };

        // Wingardium magic offset
        const onWingardium = () => {
            yOffset = -40;
            clearTimeout(magicTimeout);
            magicTimeout = setTimeout(() => { yOffset = 0; wake(); }, 6000);
            wake();
        };

        window.addEventListener('mousemove', onMove, { passive: true });
        document.documentElement.addEventListener('mouseleave', onLeave);
        window.addEventListener('click', onClick);
        window.addEventListener('wingardium-leviosa', onWingardium);

        return () => {
            document.body.classList.remove('cursor-ready');
            window.removeEventListener('mousemove', onMove);
            document.documentElement.removeEventListener('mouseleave', onLeave);
            window.removeEventListener('click', onClick);
            window.removeEventListener('wingardium-leviosa', onWingardium);
            clearTimeout(magicTimeout);
            if (raf.current) cancelAnimationFrame(raf.current);
            raf.current = 0;
        };
    }, []);

    if (typeof window !== 'undefined' && isTouchDevice()) return null;

    return (
        <>
            {/* Inner dot */}
            <div ref={dotRef} aria-hidden="true" style={{
                position: 'fixed',
                top: 0,
                left: 0,
                pointerEvents: 'none',
                zIndex: 9999,
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent-color)',
                opacity: 0,
                transition: 'opacity 0.2s',
                boxShadow: '0 0 8px 2px var(--accent-color)',
                mixBlendMode: 'screen',
                willChange: 'transform',
            }} />
            {/* Outer glowing ring */}
            <div ref={ringRef} aria-hidden="true" style={{
                position: 'fixed',
                top: 0,
                left: 0,
                pointerEvents: 'none',
                zIndex: 9998,
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: '1.5px solid var(--accent-color)',
                opacity: 0,
                transition: 'opacity 0.2s',
                boxShadow: '0 0 12px 1px var(--accent-color)',
                mixBlendMode: 'screen',
                willChange: 'transform',
            }} />
        </>
    );
};

export default CustomCursor;
