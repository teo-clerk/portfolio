import { useEffect, useMemo, useRef } from 'react';

import { resolveDeepLink } from '../commands/deepLink';
import { cvData } from '../data/cvData';
import { useLatestRef } from '../hooks/useLatestRef';
import { escapeHtml } from '../utils/escapeHtml';
import { toSemantic, wrapList } from '../utils/sectionHtml';
import { findStop, neighbourStop, STOPS, stopCommand } from './stops';

import './solarMap.css';

/**
 * A clickable terminal command inside a panel becomes a button that docks and
 * runs it, but only if it is a command a link may run (the same allow-list as
 * `?cmd=`). Anything else is left as plain text.
 */
const commandButton = (cmd, label) =>
  resolveDeepLink(cmd) ? `<button type="button" class="map-cmd" data-cmd="${escapeHtml(cmd)}">${label}</button>` : label;

/**
 * Panel markup for one CV section. The source is this site's own static
 * cvData (no visitor input reaches it), cleaned by the same function as the
 * /cv page.
 */
const sectionMarkup = (key) => wrapList(toSemantic(cvData[key] ?? '', { command: commandButton }));

const STOP_IDS = STOPS.map((stop) => stop.id);
const LABEL_RING_MIN = 9;
const LABEL_RING_MAX = 140;
/** Rough size of a label's text, for keeping labels from piling up on small screens. */
const LABEL_TEXT_GAP = 12;
const LABEL_CHAR_WIDTH = 8.4;
const LABEL_HALF_HEIGHT = 11;

const ringSize = (radius) => Math.min(LABEL_RING_MAX, Math.max(LABEL_RING_MIN, radius));

/**
 * Which labels keep their text this frame: the largest bodies first, and any
 * label whose text would overlap one already placed shows only its ring
 * (the name comes back on hover).
 */
const crowdedLabels = (labels) => {
  const placed = [];
  const crowded = new Set();
  const order = labels.filter((label) => label.visible).sort((a, b) => b.radius - a.radius);
  for (const label of order) {
    const left = label.x + ringSize(label.radius) + LABEL_TEXT_GAP;
    const box = {
      left,
      right: left + findStop(label.id).name.length * LABEL_CHAR_WIDTH,
      top: label.y - LABEL_HALF_HEIGHT,
      bottom: label.y + LABEL_HALF_HEIGHT,
    };
    const overlaps = placed.some(
      (other) => box.left < other.right && box.right > other.left && box.top < other.bottom && box.bottom > other.top
    );
    if (overlaps) crowded.add(label.id);
    else placed.push(box);
  }
  return crowded;
};

const pad = (value) => String(value).padStart(2, '0');

/**
 * The solar-system map's HTML layer: a top bar, a strip with one button per
 * stop, labels that follow the planets, and the panel for the selected stop.
 * The 3D scene owns the camera; this component only reports choices back.
 *
 * Keyboard: Tab moves through the strip, Enter opens a stop, ← / → step
 * between stops, Esc closes the panel and then the map.
 *
 * @param {{
 *   stopId: string | null,
 *   onSelect: (id: string) => void,
 *   onClose: () => void,
 *   onExit: () => void,
 *   onDock: (command: string | null) => void,
 *   registerLabels: (listener: ((labels: { id: string, x: number, y: number, radius: number, visible: boolean }[]) => void) | null) => void,
 * }} props
 */
const SolarMap = ({ stopId, onSelect, onClose, onExit, onDock, registerLabels }) => {
  const labelRefs = useRef(new Map());
  const stripRefs = useRef(new Map());
  const headingRef = useRef(null);
  const previousStopRef = useRef(null);

  const stop = stopId ? findStop(stopId) : null;
  // Read out by the live region whenever it changes.
  const announcement = stop
    ? `${stop.name}: ${stop.sections.map((section) => section.title).join(', ')}.`
    : 'Solar system map. Nine stops, one per part of the CV. Left and right arrow keys move between them, Escape goes back.';
  const markup = useMemo(
    () => (stop ? Object.fromEntries(stop.sections.map(({ key }) => [key, sectionMarkup(key)])) : {}),
    [stop]
  );

  const stopIdRef = useLatestRef(stopId);
  const onSelectRef = useLatestRef(onSelect);
  const onCloseRef = useLatestRef(onClose);
  const onExitRef = useLatestRef(onExit);

  // Labels follow the planets every frame. The scene writes their positions
  // straight to the DOM, so React does not re-render sixty times a second.
  useEffect(() => {
    registerLabels((labels) => {
      const crowded = crowdedLabels(labels);
      for (const label of labels) {
        const node = labelRefs.current.get(label.id);
        if (!node) continue;
        node.style.transform = `translate3d(${label.x.toFixed(1)}px, ${label.y.toFixed(1)}px, 0)`;
        node.style.setProperty('--ring', `${ringSize(label.radius).toFixed(1)}px`);
        node.dataset.visible = label.visible ? 'true' : 'false';
        node.dataset.crowded = crowded.has(label.id) ? 'true' : 'false';
      }
    });
    return () => registerLabels(null);
  }, [registerLabels]);

  useEffect(() => {
    stripRefs.current.get(STOP_IDS[0])?.focus({ preventScroll: true });
  }, []);

  // Focus follows the panel: its heading when a stop opens, the stop's own
  // strip button when the panel closes.
  useEffect(() => {
    if (stopId) {
      headingRef.current?.focus({ preventScroll: true });
    } else if (previousStopRef.current) {
      stripRefs.current.get(previousStopRef.current)?.focus({ preventScroll: true });
    }
    previousStopRef.current = stopId;
  }, [stopId]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.defaultPrevented || event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        if (stopIdRef.current) onCloseRef.current();
        else onExitRef.current();
      } else if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault();
        onSelectRef.current(neighbourStop(stopIdRef.current, event.key === 'ArrowRight' ? 1 : -1).id);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stopIdRef, onSelectRef, onCloseRef, onExitRef]);

  const handleBodyClick = (event) => {
    const button = event.target.closest?.('[data-cmd]');
    if (!button) return;
    const command = resolveDeepLink(button.dataset.cmd);
    if (command) onDock(command);
  };

  const index = stop ? STOP_IDS.indexOf(stop.id) : -1;
  const previous = stop ? neighbourStop(stop.id, -1) : null;
  const next = stop ? neighbourStop(stop.id, 1) : null;

  return (
    <div className="map" data-stop={stopId ?? undefined}>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>

      {/* Pointer shortcuts only: the strip below is the keyboard and screen-reader path. */}
      <div className="map-labels" aria-hidden="true">
        {STOPS.map((entry) => (
          <button
            key={entry.id}
            ref={(node) => {
              if (node) labelRefs.current.set(entry.id, node);
              else labelRefs.current.delete(entry.id);
            }}
            type="button"
            tabIndex={-1}
            className="map-label"
            data-visible="false"
            style={{ '--tint': entry.color }}
            onClick={() => onSelect(entry.id)}
          >
            <span className="map-label-ring" />
            <span className="map-label-text">
              <strong>{entry.name}</strong>
              <span>{entry.tagline}</span>
            </span>
          </button>
        ))}
      </div>

      <header className="map-bar">
        <button type="button" className="map-btn map-btn--ghost" onClick={onExit}>
          <span aria-hidden="true">←</span> Back to orbit
        </button>
        <p className="map-title">
          The solar system <span>not to scale</span>
        </p>
        <button type="button" className="map-btn map-btn--primary" onClick={() => onDock(null)}>
          Enter terminal
        </button>
      </header>

      <nav className="map-strip" aria-label="Stops in the solar system">
        <ol>
          {STOPS.map((entry, position) => (
            <li key={entry.id}>
              <button
                ref={(node) => {
                  if (node) stripRefs.current.set(entry.id, node);
                  else stripRefs.current.delete(entry.id);
                }}
                type="button"
                className="map-stop"
                aria-current={entry.id === stopId ? 'true' : undefined}
                style={{ '--tint': entry.color }}
                onClick={() => onSelect(entry.id)}
              >
                <span className="map-stop-index" aria-hidden="true">
                  {pad(position + 1)}
                </span>
                <span className="map-stop-name">{entry.name}</span>
                <span className="map-stop-section">{entry.sections.map((section) => section.title).join(' · ')}</span>
              </button>
            </li>
          ))}
        </ol>
      </nav>

      {stop && (
        <section className="map-panel" aria-labelledby="map-panel-title" style={{ '--tint': stop.color }}>
          <header className="map-panel-head">
            <p className="map-panel-kicker">
              <span>{pad(index + 1)} / {pad(STOPS.length)}</span> {stop.name}
            </p>
            {/* One section: its name. Several: the stop's tagline, with a heading per section below. */}
            <h2 id="map-panel-title" ref={headingRef} tabIndex={-1}>
              {stop.sections.length === 1 ? stop.sections[0].title : stop.tagline}
            </h2>
            <button type="button" className="map-panel-close" onClick={onClose} aria-label="Close panel">
              <span aria-hidden="true">×</span>
            </button>
          </header>

          <div className="map-panel-body" onClick={handleBodyClick}>
            {stop.sections.map((section) => (
              <article key={section.key} className="map-section">
                {stop.sections.length > 1 && <h3>{section.title}</h3>}
                <div className="map-section-body" dangerouslySetInnerHTML={{ __html: markup[section.key] }} />
              </article>
            ))}
          </div>

          <footer className="map-panel-foot">
            <button type="button" className="map-btn map-btn--primary map-open" onClick={() => onDock(stopCommand(stop))}>
              Open in terminal <kbd>{stopCommand(stop)}</kbd>
            </button>
            <div className="map-panel-nav">
              <button type="button" className="map-btn map-btn--ghost" onClick={() => onSelect(previous.id)} aria-label={`Previous stop: ${previous.name}`}>
                <span aria-hidden="true">‹</span> {previous.name}
              </button>
              <button type="button" className="map-btn map-btn--ghost" onClick={() => onSelect(next.id)} aria-label={`Next stop: ${next.name}`}>
                {next.name} <span aria-hidden="true">›</span>
              </button>
            </div>
          </footer>
        </section>
      )}
    </div>
  );
};

export default SolarMap;
