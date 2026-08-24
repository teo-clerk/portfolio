import { useEffect, useRef } from 'react';

const CHARS = 'ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789ABCDEF<>[]{}|';
const FONT_SIZE = 16;
const EXIT_GUARD_MS = 400;

const MatrixRain = ({ onExit }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const coarse = window.matchMedia('(pointer: coarse)').matches;
        const step = coarse ? FONT_SIZE * 1.5 : FONT_SIZE;

        // Column state survives resize. Previously `columns` and `drops` were
        // computed once at mount while the canvas kept resizing under them, so
        // after a rotation the rain either stopped short or drew off-canvas.
        let drops = [];

        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
            const cssWidth = window.innerWidth;
            const cssHeight = window.innerHeight;

            canvas.width = Math.floor(cssWidth * dpr);
            canvas.height = Math.floor(cssHeight * dpr);
            canvas.style.width = `${cssWidth}px`;
            canvas.style.height = `${cssHeight}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.font = `${step}px 'Fira Code', monospace`;

            const columns = Math.ceil(cssWidth / step);
            drops = Array.from({ length: columns }, (_, i) => drops[i] ?? 1);
        };

        resize();
        window.addEventListener('resize', resize);

        const draw = () => {
            const cssHeight = window.innerHeight;
            const cssWidth = window.innerWidth;

            ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
            ctx.fillRect(0, 0, cssWidth, cssHeight);

            for (let i = 0; i < drops.length; i++) {
                const char = CHARS[Math.floor(Math.random() * CHARS.length)];
                const brightness = Math.random();

                // Canvas shadows are among the most expensive 2D operations
                // there is, so they are skipped entirely on touch devices.
                if (brightness > 0.95) {
                    ctx.fillStyle = '#fff';
                    if (!coarse) {
                        ctx.shadowColor = '#27c93f';
                        ctx.shadowBlur = 8;
                    }
                } else {
                    ctx.fillStyle = `rgba(39, 201, 63, ${0.4 + brightness * 0.6})`;
                    ctx.shadowBlur = 0;
                }

                ctx.fillText(char, i * step, drops[i] * step);
                ctx.shadowBlur = 0;

                if (drops[i] * step > cssHeight && Math.random() > 0.975) {
                    drops[i] = 0;
                }
                drops[i]++;
            }
        };

        // rAF rather than setInterval: the browser throttles it correctly in
        // background tabs, where setInterval would keep burning CPU.
        const FRAME_MS = coarse ? 67 : 40;
        let raf = 0;
        let last = 0;

        const loop = (t) => {
            raf = requestAnimationFrame(loop);
            if (t - last < FRAME_MS) return;
            last = t;
            draw();
        };
        raf = requestAnimationFrame(loop);

        const openedAt = Date.now();
        const handleKey = (e) => {
            if (e.key === 'q' || e.key === 'Escape' || e.key === 'Enter') onExit();
        };
        // Ignore clicks fired within the guard window so the click that opened
        // the overlay does not immediately close it.
        const handleClick = () => {
            if (Date.now() - openedAt > EXIT_GUARD_MS) onExit();
        };

        window.addEventListener('keydown', handleKey);
        window.addEventListener('click', handleClick);
        window.addEventListener('touchend', handleClick);

        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', resize);
            window.removeEventListener('keydown', handleKey);
            window.removeEventListener('click', handleClick);
            window.removeEventListener('touchend', handleClick);
        };
    }, [onExit]);

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Matrix rain. Press any key or click to exit."
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 999,
                background: '#000',
            }}
        >
            <canvas ref={canvasRef} aria-hidden="true" style={{ display: 'block' }} />
            <div style={{
                position: 'absolute',
                bottom: '2rem',
                left: 0,
                right: 0,
                textAlign: 'center',
                color: 'rgba(39,201,63,0.5)',
                fontFamily: "'Fira Code', monospace",
                fontSize: '0.8rem',
                pointerEvents: 'none',
            }}>
                press any key or click to exit
            </div>
        </div>
    );
};

export default MatrixRain;
