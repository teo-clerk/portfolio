import { lazy, Suspense, useEffect, useRef, useState } from 'react';

import { useLatestRef } from '../hooks/useLatestRef';
import { computePosterZoom, POSTER_DOCK_MS, SCENE_DOCK_MS } from './introState';
import { POSTER_META } from './posterMeta';
import { useOrbitScene } from './useOrbitScene';

import posterLandscapeAvif from './assets/orbit-poster-landscape.avif';
import posterLandscapeWebp from './assets/orbit-poster-landscape.webp';
import posterPortraitAvif from './assets/orbit-poster-portrait.avif';
import posterPortraitWebp from './assets/orbit-poster-portrait.webp';

import './intro.css';

/** The map's UI is only needed once the live scene is up; it has its own chunk. */
const loadSolarMap = () => import('./SolarMap');
const SolarMap = lazy(loadSolarMap);

/** Same ratio as PORTRAIT_MAX_ASPECT in introState.js and the layout in intro.css. */
const PORTRAIT_MEDIA = '(max-aspect-ratio: 23/20)';

/** `object-position` of the poster in each composition (see .intro-poster in intro.css). */
const POSTER_ANCHOR_LANDSCAPE = Object.freeze({ x: 0.5, y: 0.5 });
const POSTER_ANCHOR_PORTRAIT = Object.freeze({ x: 0.5, y: 0 });

/** If the fly-in has not reported back this long after it should have, carry on anyway. */
const DOCK_GRACE_MS = 600;

/** The hand-over fade starts this long before the fly-in ends. */
const DOCK_FADE_LEAD_MS = 320;

/** One wheel gesture fires many events; act on the first and ignore the rest for this long. */
const WHEEL_COOLDOWN_MS = 1400;
const WHEEL_MIN_DELTA = 8;
/** Firefox reports a mouse wheel in lines (deltaMode 1) and rarely pages (2). */
const WHEEL_LINE_PX = 16;
const WHEEL_PAGE_PX = 800;

const isInteractive = (target) => Boolean(target?.closest?.('a, button, input, textarea, select'));

/**
 * The front door: who this is and four ways in, as ordinary HTML that works
 * without typing a command. Behind it sits the orbit backdrop: a still poster
 * on every device, with the live scene cross-faded over it where the device
 * can afford one. With the live scene up, the visitor can also fly out to the
 * solar-system map, where each planet holds a section of the CV.
 *
 * @param {{
 *   mode: 'scene' | 'poster' | 'static',
 *   quality: 'high' | 'lite',
 *   onDock: (command: string | null) => void,
 * }} props `onDock` is called once the fly-in has finished, with the command
 *   the terminal should run on arrival (or null).
 */
const Landing = ({ mode, quality, onDock }) => {
  const [isDocking, setIsDocking] = useState(false);
  const [dockMs, setDockMs] = useState(SCENE_DOCK_MS);
  const [posterZoom, setPosterZoom] = useState(null);
  /** @type {['home' | 'map', Function]} */
  const [view, setView] = useState('home');
  const [stopId, setStopId] = useState(null);

  const canvasRef = useRef(null);
  const backdropRef = useRef(null);
  const primaryRef = useRef(null);
  const exploreRef = useRef(null);
  const hasDockedRef = useRef(false);
  const timerRef = useRef(0);
  const wheelAtRef = useRef(0);
  const wasMapRef = useRef(false);

  const scene = useOrbitScene({
    canvasRef,
    isEnabled: mode === 'scene',
    quality,
    // FloodFusion is built on Sentinel-1 radar: the satellite opens it.
    onActivate: (target) => dock(target === 'satellite' ? 'floodfusion' : null),
    onStopSelect: (id) => selectStop(id),
  });
  const isMapAvailable = mode === 'scene' && scene.isLive && !isDocking;

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
      const ms = scene.getDockMs() ?? SCENE_DOCK_MS;
      setDockMs(ms);
      flight.then(finish);
      // The fly-in is driven by animation frames, which stop in a hidden tab.
      // Do not leave the visitor on a faded, inert landing if that happens.
      timerRef.current = window.setTimeout(finish, ms + DOCK_GRACE_MS);
      return;
    }

    // Docking on the still image: a scene that is still loading is not needed.
    scene.cancel();
    setDockMs(POSTER_DOCK_MS);
    setPosterZoom(zoomIntoPoster());
    timerRef.current = window.setTimeout(finish, POSTER_DOCK_MS);
  }

  function openMap() {
    if (!isMapAvailable || view === 'map') return;
    setView('map');
    setStopId(null);
    scene.enterMap();
  }

  function closeMap() {
    if (view !== 'map' || isDocking) return;
    setView('home');
    setStopId(null);
    scene.exitMap();
  }

  function selectStop(id) {
    if (view !== 'map' || isDocking) return;
    setStopId(id);
    scene.focusStop(id);
  }

  function closeStop() {
    if (view !== 'map' || isDocking) return;
    setStopId(null);
    scene.focusStop(null);
  }

  const dockRef = useLatestRef(dock);
  const viewRef = useLatestRef(view);
  const stopIdRef = useLatestRef(stopId);
  const openMapRef = useLatestRef(openMap);
  const closeMapRef = useLatestRef(closeMap);
  const closeStopRef = useLatestRef(closeStop);

  useEffect(() => {
    primaryRef.current?.focus({ preventScroll: true });

    // Enter anywhere on the landing docks. On a button or link it already does
    // what that control says, so leave those alone; in the map, Enter belongs
    // to the map's own controls.
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
      if (viewRef.current !== 'home') return;
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
  }, [dockRef, viewRef]);

  // Scroll down to fly out to the solar system; scroll up to come back.
  useEffect(() => {
    if (mode !== 'scene') return undefined;
    const handleWheel = (event) => {
      // A trackpad pinch arrives as a wheel event with ctrlKey set: that is zoom, not scroll.
      if (event.ctrlKey) return;
      const scale = event.deltaMode === 1 ? WHEEL_LINE_PX : event.deltaMode === 2 ? WHEEL_PAGE_PX : 1;
      const deltaY = event.deltaY * scale;
      if (Math.abs(deltaY) < WHEEL_MIN_DELTA) return;
      // A panel's own content scrolls; never steal that.
      if (event.target?.closest?.('.map-panel, .map-strip')) return;
      const now = performance.now();
      if (now - wheelAtRef.current < WHEEL_COOLDOWN_MS) return;
      const view = viewRef.current;
      if (deltaY > 0 && view === 'home') openMapRef.current();
      else if (deltaY < 0 && view === 'map') {
        if (stopIdRef.current) closeStopRef.current();
        else closeMapRef.current();
      } else {
        // Nothing to do (up at home, down in the map): leave the cooldown alone.
        return;
      }
      wheelAtRef.current = now;
    };
    window.addEventListener('wheel', handleWheel, { passive: true });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [mode, viewRef, stopIdRef, openMapRef, closeMapRef, closeStopRef]);

  // Warm the map's chunk once the scene is up, so opening it is instant.
  useEffect(() => {
    if (scene.isLive) loadSolarMap().catch(() => undefined);
  }, [scene.isLive]);

  // Back from the map: return focus to the control that opened it.
  useEffect(() => {
    if (view === 'home' && wasMapRef.current) exploreRef.current?.focus({ preventScroll: true });
    wasMapRef.current = view === 'map';
  }, [view]);

  const isSceneShown = scene.isLive && !posterZoom;

  const backdropStyle = posterZoom
    ? { transform: `translate(${posterZoom.translateX}px, ${posterZoom.translateY}px) scale(${posterZoom.scale})` }
    : undefined;
  const fadeStyle = { animationDelay: `${Math.max(0, dockMs - DOCK_FADE_LEAD_MS)}ms` };

  return (
    <main
      className="intro"
      data-mode={mode}
      data-view={view}
      data-docking={isDocking ? 'true' : undefined}
    >
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

      <div className="intro-content" inert={isDocking || view === 'map'}>
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
            FloodFusion: flood maps from Sentinel{'‑'}1 radar <span aria-hidden="true">→</span>
          </button>
        </p>

        {/* Space is reserved from the start, so the control fading in once the
            scene is live does not shift the layout. */}
        {mode === 'scene' && (
          <button
            ref={exploreRef}
            type="button"
            className="intro-explore"
            data-ready={isMapAvailable ? 'true' : undefined}
            disabled={!isMapAvailable}
            onClick={openMap}
          >
            <span className="intro-explore-orbit" aria-hidden="true" />
            <span className="intro-explore-text">
              <strong>Explore the solar system</strong>
              <span>Every planet holds part of the CV</span>
            </span>
          </button>
        )}

        <p className="intro-hint">
          The site is a terminal you can type into. Press <kbd>Enter</kbd> to fly in, or use the buttons: no typing
          needed.
        </p>
      </div>

      {view === 'map' && !isDocking && (
        <Suspense fallback={null}>
          <SolarMap
            stopId={stopId}
            onSelect={selectStop}
            onClose={closeStop}
            onExit={closeMap}
            onDock={dock}
            registerLabels={scene.setLabelListener}
          />
        </Suspense>
      )}

      {isDocking && <div className="intro-dock-fade" style={fadeStyle} aria-hidden="true" />}
    </main>
  );
};

export default Landing;
