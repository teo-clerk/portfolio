import { useEffect, useRef } from 'react';

const CHARS = 'ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789ABCDEF<>[]{}|';
const FONT_SIZE = 16;

const MatrixRain = ({ onExit }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        // Adaptive: use fewer visual columns on small screens
        const step = window.innerWidth <= 768 ? FONT_SIZE * 1.5 : FONT_SIZE;
        const columns = Math.floor(canvas.width / step);
        const drops = Array(columns).fill(1);

        const draw = () => {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            drops.forEach((drop, i) => {
                const char = CHARS[Math.floor(Math.random() * CHARS.length)];
                const brightness = Math.random();

                if (brightness > 0.95) {
                    ctx.fillStyle = '#fff';
                    ctx.shadowColor = '#27c93f';
                    ctx.shadowBlur = 8;
                } else {
                    ctx.fillStyle = `rgba(39, 201, 63, ${0.4 + brightness * 0.6})`;
                    ctx.shadowBlur = 0;
                }

                ctx.font = `${step}px 'Fira Code', monospace`;
                ctx.fillText(char, i * step, drop * step);
                ctx.shadowBlur = 0;

                if (drop * step > canvas.height && Math.random() > 0.975) {
                    drops[i] = 0;
                }
                drops[i]++;
            });
        };

        // Adaptive frame rate: 25fps desktop, 15fps mobile
        const fps = window.innerWidth <= 768 ? 67 : 40;
        const interval = setInterval(draw, fps);

        const openedAt = Date.now();
        const handleKey = (e) => {
            if (e.key === 'q' || e.key === 'Escape' || e.key === 'Enter') onExit();
        };
        // Guard: ignore clicks within 400ms of mount (prevents the opening click from closing it)
        const handleClick = () => {
            if (Date.now() - openedAt > 400) onExit();
        };
        window.addEventListener('keydown', handleKey);
        window.addEventListener('click', handleClick);
        window.addEventListener('touchend', handleClick);

        return () => {
            clearInterval(interval);
            window.removeEventListener('resize', resize);
            window.removeEventListener('keydown', handleKey);
            window.removeEventListener('click', handleClick);
            window.removeEventListener('touchend', handleClick);
        };
    }, [onExit]);

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999,
            background: '#000',
        }}>
            <canvas ref={canvasRef} style={{ display: 'block' }} />
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
