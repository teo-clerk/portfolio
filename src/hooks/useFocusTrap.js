import { useEffect } from 'react';

/**
 * Keyboard containment for full-screen overlays (Pong, Snake, DOOM).
 *
 * Marking a div `role="dialog" aria-modal="true"` tells a screen reader the
 * rest of the page is inert, but it does nothing about Tab: focus still walks
 * straight out into the terminal behind the overlay, where the input is
 * disabled and nothing is visible. This keeps Tab inside the container and
 * puts focus back where it came from on unmount.
 *
 * The focusable set is re-queried on every Tab rather than cached at mount, so
 * controls that appear later (a "Restart" button that only exists once the game
 * is over) are picked up, and controls hidden by a media query are skipped.
 *
 * `onEscape` is optional: several overlays already own an Escape handler as
 * part of their game controls, and wiring a second one here would call the exit
 * callback twice. Pass it only for overlays that have none.
 */
const FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'iframe',
    '[tabindex]:not([tabindex="-1"])',
].join(', ');

export const useFocusTrap = (containerRef, { onEscape } = {}) => {
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // Captured in the effect, never during render — `react-hooks/refs`.
        const previouslyFocused = document.activeElement;

        const focusableItems = () =>
            Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
                // offsetParent is null for `display: none` subtrees, which is how
                // the mobile D-pad is hidden on pointer-fine devices.
                (el) => el.offsetParent !== null || el === document.activeElement
            );

        (focusableItems()[0] ?? container).focus?.();

        const onKeyDown = (e) => {
            if (e.key === 'Escape' && onEscape) {
                e.preventDefault();
                onEscape();
                return;
            }
            // Everything else — arrow keys, WASD, swipe — belongs to the game.
            if (e.key !== 'Tab') return;

            const items = focusableItems();
            e.preventDefault();
            if (items.length === 0) return;

            const current = items.indexOf(document.activeElement);
            const last = items.length - 1;
            const next = e.shiftKey
                ? (current <= 0 ? last : current - 1)
                : (current === -1 || current === last ? 0 : current + 1);
            items[next]?.focus();
        };

        window.addEventListener('keydown', onKeyDown);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            // The element may have been unmounted while the overlay was open.
            previouslyFocused?.focus?.();
        };
    }, [containerRef, onEscape]);
};
