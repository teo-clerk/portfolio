import { useEffect, useRef, useState } from 'react';

// Characters appended per tick. Higher = faster.
const CHARS_PER_TICK = 6;

/**
 * Types HTML content into a container node-by-node.
 *
 * Two performance notes:
 *
 *  - Scrolling is coalesced to one write per animation frame. The previous
 *    version read `scrollHeight` (a layout-forcing read) after every 6
 *    characters, which for a ~2,000 character help screen meant ~330 forced
 *    synchronous reflows per command.
 *
 *  - Pacing uses rAF rather than `setTimeout(1)`. Nested timeouts are clamped
 *    to ~4ms after depth 5, so the old TYPE_SPEED of 1ms was never real.
 */
export const useTypewriter = (htmlContent, onComplete) => {
    const containerRef = useRef(null);
    const [isTyping, setIsTyping] = useState(true);
    const skipRef = useRef(false);

    // Held in a ref so a changing callback identity never restarts the animation.
    const onCompleteRef = useRef(onComplete);
    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    useEffect(() => {
        if (!containerRef.current || !htmlContent) return;

        const container = containerRef.current;
        container.innerHTML = '';

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;

        let isCancelled = false;
        let scrollQueued = false;
        let scrollRaf = 0;

        const queueScroll = () => {
            if (scrollQueued) return;
            scrollQueued = true;
            scrollRaf = requestAnimationFrame(() => {
                scrollQueued = false;
                const body = document.getElementById('terminal-body');
                if (body) body.scrollTop = body.scrollHeight;
            });
        };

        const nextFrame = () => new Promise((resolve) => {
            scrollRaf = requestAnimationFrame(resolve);
        });

        // Users who asked for reduced motion get the finished output at once.
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduced) skipRef.current = true;

        const typeNode = async (node, parent) => {
            if (isCancelled) return;

            if (skipRef.current) {
                parent.appendChild(node.cloneNode(true));
                return;
            }

            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent;
                let i = 0;

                while (i < text.length) {
                    if (isCancelled) return;
                    if (skipRef.current) {
                        parent.append(text.substring(i));
                        break;
                    }

                    parent.append(text.substring(i, i + CHARS_PER_TICK));
                    i += CHARS_PER_TICK;

                    queueScroll();
                    await nextFrame();
                }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                const el = node.cloneNode(false);
                parent.appendChild(el);

                // Large ASCII art is inserted wholesale rather than typed. Walking
                // it character-by-character used to freeze the browser.
                if (el.classList && el.classList.contains('ascii-art')) {
                    el.innerHTML = node.innerHTML;
                    queueScroll();
                    await nextFrame();
                    return;
                }

                if (el.tagName === 'BR') {
                    queueScroll();
                    await nextFrame();
                }

                for (const child of node.childNodes) {
                    await typeNode(child, el);
                }
            }
        };

        const startTyping = async () => {
            setIsTyping(true);
            if (!reduced) skipRef.current = false;

            for (const child of tempDiv.childNodes) {
                await typeNode(child, container);
            }

            if (isCancelled) return;
            queueScroll();
            setIsTyping(false);
            onCompleteRef.current?.();
        };

        startTyping();

        return () => {
            isCancelled = true;
            if (scrollRaf) cancelAnimationFrame(scrollRaf);
        };
    }, [htmlContent]);

    const skip = () => {
        skipRef.current = true;
    };

    return { containerRef, isTyping, skip };
};
