/**
 * Glow (bloom) on the CRT, the power light, the Sun and the atmosphere.
 *
 * Desktop only, and its own chunk: orbitScene.js loads it with a dynamic
 * import on the 'high' quality rung, so phones never download the
 * post-processing code. The scene renders into a multisampled half-float
 * target (bloom needs values above 1, and the composer bypasses the canvas's
 * own antialiasing), then OutputPass applies tone mapping and sRGB.
 */
import { HalfFloatType, Vector2, WebGLRenderTarget } from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const BLOOM_STRENGTH = 0.55;
const BLOOM_RADIUS = 0.55;
/** Linear luminance above which a pixel glows: the screen text, the LED, the Sun. */
const BLOOM_THRESHOLD = 0.82;
const SAMPLES = 4;

/**
 * @param {import('three').WebGLRenderer} renderer
 * @param {import('three').Scene} scene
 * @param {import('three').Camera} camera
 * @returns {{ render: () => void, setSize: (width: number, height: number) => void, dispose: () => void }}
 */
export const createBloom = (renderer, scene, camera) => {
  const size = renderer.getSize(new Vector2());
  const target = new WebGLRenderTarget(size.x, size.y, { type: HalfFloatType, samples: SAMPLES });
  const composer = new EffectComposer(renderer, target);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(size.x, size.y);

  const bloom = new UnrealBloomPass(new Vector2(size.x, size.y), BLOOM_STRENGTH, BLOOM_RADIUS, BLOOM_THRESHOLD);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  return {
    render: () => composer.render(),
    setSize: (width, height) => {
      composer.setPixelRatio(renderer.getPixelRatio());
      composer.setSize(width, height);
    },
    dispose: () => {
      bloom.dispose();
      composer.dispose();
      target.dispose();
    },
  };
};
