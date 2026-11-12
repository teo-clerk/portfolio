import { useEffect, useRef, useState } from 'react';

import { useLatestRef } from '../hooks/useLatestRef';
import { computePosterZoom, POSTER_DOCK_MS, SCENE_DOCK_MS } from './introState';
import { POSTER_META } from './posterMeta';
import { useOrbitScene } from './useOrbitScene';

import posterLandscapeAvif from './assets/orbit-poster-landscape.avif';
import posterLandscapeWebp from './assets/orbit-poster-landscape.webp';
import posterPortraitAvif from './assets/orbit-poster-portrait.avif';
import posterPortraitWebp from './assets/orbit-poster-portrait.webp';

import './intro.css';

/** Same ratio as PORTRAIT_MAX_ASPECT in introState.js and the layout in intro.css. */
const PORTRAIT_MEDIA = '(max-aspect-ratio: 23/20)';

/** `object-position` of the poster in each composition (see .intro-poster in intro.css). */
const POSTER_ANCHOR_LANDSCAPE = Object.freeze({ x: 0.5, y: 0.5 });
const POSTER_ANCHOR_PORTRAIT = Object.freeze({ x: 0.5, y: 0 });

/** If the fly-in has not reported back this long after it should have, carry on anyway. */
const DOCK_GRACE_MS = 600;

/** The hand-over fade starts this long before the fly-in ends. */
const DOCK_FADE_LEAD_MS = 320;

const isInteractive = (target) => Boolean(target?.closest?.('a, button, input, textarea, select'));

/**
 * The front door: who this is and four ways in, as ordinary HTML that works
 * without typing a command. Behind it sits the orbit backdrop: a still poster
 * on every device, with the live scene cross-faded over it where the device
 * can afford one.
 *
 * @param {{
 *   mode: 'scene' | 'poster' | 'static',
 *   onDock: (command: string | null) => void,
 * }} props `onDock` is called once the fly-in has finished, with the command
 *   the terminal should run on arrival (or null).
 */
const Landing = ({ mode, onDock }) => {
  const [isDocking, setIsDocking] = useState(false);
  const [posterZoom, setPosterZoom] = useState(null);

  const canvasRef = useRef(null);
  const backdropRef = useRef(null);
  const primaryRef = useRef(null);
  const hasDockedRef = useRef(false);
  const timerRef = useRef(0);

  const scene = useOrbitScene({
    canvasRef,
    isEnabled: mode === 'scene',
    onActivate: () => dock(),
  });

  function zoomIntoPoster() {
    const backdrop = backdropRef.current;
    // The same query the <picture> sources use, so it is right even before
    // the image has loaded (naturalWidth is 0 until then).
    const isPortrait = window.matchMedia(PORTRAIT_MEDIA).matches;
    const meta = isPortrait ? POSTER_META.portrait : POSTER_META.landscape;
    return computePosterZoom({
      viewport: { width: backdrop?.clientWidth ?? 0, height: backdrop?.clientHeight ?? 0 },
      image: meta,
      screen: meta.screen,
      // Mirrors `object-position` on .intro-poster in intro.css.
      anchor: isPortrait ? POSTER_ANCHOR_PORTRAIT : POSTER_ANCHOR_LANDSCAPE,
    });
  }

  function dock(command = null) {
    if (hasDockedRef.current) return;
    hasDockedRef.current = true;

    let isFinished = false;
    const finish = () => {
      if (isFinished) return;
      isFinished = true;
      window.clearTimeout(timerRef.current);
      onDock(command);
    };

    if (mode === 'static') {
      finish();
      return;
    }

    setIsDocking(true);

    const flight = scene.isLive ? scene.dock() : null;
    if (flight) {
      flight.then(finish);
      // The fly-in is driven by animation frames, which stop in a hidden tab.
      // Do not leave the visitor on a faded, inert landing if that happens.
      timerRef.current = window.setTimeout(finish, SCENE_DOCK_MS + DOCK_GRACE_MS);
      return;
    }

    // Docking on the still image: a scene that is still loading is not needed.
    scene.cancel();
    setPosterZoom(zoomIntoPoster());
    timerRef.current = window.setTimeout(finish, POSTER_DOCK_MS);
  }

  const dockRef = useLatestRef(dock);

  useEffect(() => {
    primaryRef.current?.focus({ preventScroll: true });

    // Enter anywhere docks. On a button or link it already does what that
    // control says, so leave those alone.
    const handleKeyDown = (event) => {
      if (event.key !== 'Enter') return;
      // A held key must never dock. Preventing the default also stops a
      // repeated Enter from "clicking" the focused button: `exit` is run with
      // Enter, and a key held a moment too long would otherwise land on the
      // landing's primary button and dock straight back in.
      if (event.repeat) {
        event.preventDefault();
        return;
      }
      if (event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return;
      if (isInteractive(event.target)) return;
      event.preventDefault();
      dockRef.current();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.clearTimeout(timerRef.current);
    };
  }, [dockRef]);

  const isSceneShown = scene.isLive && !posterZoom;
  const dockMs = posterZoom ? POSTER_DOCK_MS : SCENE_DOCK_MS;

  const backdropStyle = posterZoom
    ? { transform: `translate(${posterZoom.translateX}px, ${posterZoom.translateY}px) scale(${posterZoom.scale})` }
    : undefined;
  const fadeStyle = { animationDelay: `${Math.max(0, dockMs - DOCK_FADE_LEAD_MS)}ms` };

  return (
    <main className="intro" data-mode={mode} data-docking={isDocking ? 'true' : undefined}>
      <div className="intro-backdrop" ref={backdropRef} style={backdropStyle} aria-hidden="true">
        <picture>
          <source media={PORTRAIT_MEDIA} type="image/avif" srcSet={posterPortraitAvif} />
          <source media={PORTRAIT_MEDIA} type="image/webp" srcSet={posterPortraitWebp} />
          <source type="image/avif" srcSet={posterLandscapeAvif} />
          <img
            className="intro-poster"
            src={posterLandscapeWebp}
            alt=""
            decoding="async"
            fetchPriority="high"
            draggable="false"
          />
        </picture>
        {mode === 'scene' && (
          <canvas ref={canvasRef} className="intro-canvas" data-live={isSceneShown ? 'true' : undefined} />
        )}
      </div>

      <div className="intro-scrim" aria-hidden="true" />

      <div className="intro-content" inert={isDocking}>
        <p className="intro-eyebrow">Interactive portfolio</p>
        <h1 className="intro-name">Teo Clerici</h1>
        <p className="intro-role">
          AI &amp; Data Science student building AI for Earth observation and AI learning tools.
        </p>

        <div className="intro-actions">
          <button ref={primaryRef} type="button" className="intro-btn intro-btn--primary" onClick={() => dock()}>
            Enter terminal
          </button>
          <button type="button" className="intro-btn intro-btn--wide" onClick={() => dock('recruiter')}>
            60-second summary
          </button>
          <a className="intro-btn" href="/cv">
            Read the CV
          </a>
          <a className="intro-btn" href="/CV.pdf" download="Teo_Clerici_CV.pdf">
            Download PDF
          </a>
        </div>

        <p className="intro-featured">
          <span className="intro-featured-label">Featured project</span>
          <button type="button" className="intro-link" onClick={() => dock('floodfusion')}>
            FloodFusion: flood maps from Sentinel{'\u2011'}1 radar <span aria-hidden="true">→</span>
          </button>
        </p>

        <p className="intro-hint">
          The site is a terminal you can type into. Press <kbd>Enter</kbd> to fly in, or use the buttons: no typing
          needed.
        </p>
      </div>

      {isDocking && <div className="intro-dock-fade" style={fadeStyle} aria-hidden="true" />}
    </main>
  );
};

export default Landing;
