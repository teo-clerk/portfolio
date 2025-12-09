import { useEffect, useRef, useState } from 'react';

// Speed in ms per chunk
const TYPE_SPEED = 1; 
// Characters to type per tick (increase for faster speed)
// MODIFY HERE TO CHANGE SPEED: Higher number = Faster
const CHARS_PER_TICK = 6;

export const useTypewriter = (htmlContent, onComplete) => {
    const containerRef = useRef(null);
    const [isTyping, setIsTyping] = useState(true);
    const skipRef = useRef(false);

    useEffect(() => {
        if (!containerRef.current || !htmlContent) return;

        const container = containerRef.current;
        container.innerHTML = ''; // Clear initial content
        
        // Create temp div to parse HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        
        let isCancelled = false;

        const typeNode = async (node, parent) => {
            if (isCancelled) return;
            
            if (skipRef.current) {
                const clone = node.cloneNode(true);
                parent.appendChild(clone);
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

                    // Append a chunk of characters
                    const chunk = text.substring(i, i + CHARS_PER_TICK);
                    parent.append(chunk);
                    i += CHARS_PER_TICK;

                    // Scroll to bottom
                    const terminalBody = document.getElementById('terminal-body');
                    if (terminalBody) terminalBody.scrollTop = terminalBody.scrollHeight;
                    
                    await new Promise(r => setTimeout(r, TYPE_SPEED));
                }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                const el = node.cloneNode(false);
                parent.appendChild(el);
                
                if (el.tagName === 'BR') {
                    const terminalBody = document.getElementById('terminal-body');
                    if (terminalBody) terminalBody.scrollTop = terminalBody.scrollHeight;
                    await new Promise(r => setTimeout(r, 5)); // Reduced pause for newlines
                }

                if (node.childNodes.length > 0) {
                    for (const child of node.childNodes) {
                        await typeNode(child, el);
                    }
                }
            }
        };

        const startTyping = async () => {
            setIsTyping(true);
            skipRef.current = false;
            
            for (const child of tempDiv.childNodes) {
                await typeNode(child, container);
            }
            
            setIsTyping(false);
            if (onComplete) onComplete();
        };

        startTyping();

        return () => {
            isCancelled = true;
        };
    }, [htmlContent]);

    const skip = () => {
        skipRef.current = true;
    };

    return { containerRef, isTyping, skip };
};
