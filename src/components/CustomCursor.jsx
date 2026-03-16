import { useEffect, useRef } from 'react';

// Custom cursor — only on non-touch devices
const isTouchDevice = () =>
    typeof window !== 'undefined' &&
    (window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window);

const CustomCursor = () => {
    const dotRef = useRef(null);
    const ringRef = useRef(null);
    const pos = useRef({ x: -200, y: -200 });
    const ring = useRef({ x: -200, y: -200 });
    const raf = useRef(null);
    const isVisible = useRef(false);

    useEffect(() => {
        if (isTouchDevice()) return;

        const dot = dotRef.current;
        const ringEl = ringRef.current;
        if (!dot || !ringEl) return;

        const onMove = (e) => {
            pos.current = { x: e.clientX, y: e.clientY };
            if (!isVisible.current) {
                isVisible.current = true;
                dot.style.opacity = '1';
                ringEl.style.opacity = '1';
            }
        };

        const onLeave = () => {
            isVisible.current = false;
            dot.style.opacity = '0';
            ringEl.style.opacity = '0';
        };

        const onClick = () => {
            ringEl.style.transform = 'translate(-50%, -50%) scale(1.8)';
            ringEl.style.opacity = '0.2';
            setTimeout(() => {
                ringEl.style.transform = 'translate(-50%, -50%) scale(1)';
                ringEl.style.opacity = '1';
            }, 200);
        };

        // Wingardium magic 🪄 offset
        let yOffset = 0;
        let magicTimeout;
        const onWingardium = () => {
            yOffset = -40; // Float 40px up
            clearTimeout(magicTimeout);
            magicTimeout = setTimeout(() => { yOffset = 0; }, 6000); // Drop after 6 seconds
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseleave', onLeave);
        window.addEventListener('click', onClick);
        window.addEventListener('wingardium-leviosa', onWingardium);

        let lastFrame = 0;
        const tick = (ts) => {
            // Throttle ring lerp to 60fps
            if (ts - lastFrame > 8) {
                const targetY = pos.current.y + yOffset;
                ring.current.x += (pos.current.x - ring.current.x) * 0.12;
                ring.current.y += (targetY - ring.current.y) * 0.12;

                dot.style.left = pos.current.x + 'px';
                dot.style.top = targetY + 'px';
                ringEl.style.left = ring.current.x + 'px';
                ringEl.style.top = ring.current.y + 'px';
                lastFrame = ts;
            }
            raf.current = requestAnimationFrame(tick);
        };
        raf.current = requestAnimationFrame(tick);

        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseleave', onLeave);
            window.removeEventListener('click', onClick);
            window.removeEventListener('wingardium-leviosa', onWingardium);
            clearTimeout(magicTimeout);
            cancelAnimationFrame(raf.current);
        };
    }, []);

    if (typeof window !== 'undefined' && isTouchDevice()) return null;

    return (
        <>
            {/* Inner dot */}
            <div ref={dotRef} style={{
                position: 'fixed',
                pointerEvents: 'none',
                zIndex: 9999,
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent-color)',
                transform: 'translate(-50%, -50%)',
                opacity: 0,
                transition: 'opacity 0.2s',
                boxShadow: '0 0 8px 2px var(--accent-color)',
                mixBlendMode: 'screen',
            }} />
            {/* Outer glowing ring */}
            <div ref={ringRef} style={{
                position: 'fixed',
                pointerEvents: 'none',
                zIndex: 9998,
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: '1.5px solid var(--accent-color)',
                transform: 'translate(-50%, -50%) scale(1)',
                opacity: 0,
                transition: 'opacity 0.2s, transform 0.2s ease',
                boxShadow: '0 0 12px 1px var(--accent-color)',
                mixBlendMode: 'screen',
            }} />
        </>
    );
};

export default CustomCursor;
