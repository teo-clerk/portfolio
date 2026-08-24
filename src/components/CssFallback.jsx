/**
 * Zero-JS, zero-GPU-shader background for the 'none' device tier.
 *
 * Everything here is compositor-only (transform + opacity), so it costs
 * essentially nothing on the main thread and nothing per-frame on the GPU
 * beyond a single layer composite. The animation is disabled entirely under
 * prefers-reduced-motion by the global rule in index.css, and the tier that
 * selects this component already returns 'none' for that case anyway.
 */
const CssFallback = () => <div className="bg-fallback" aria-hidden="true" />;

export default CssFallback;
