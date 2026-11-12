/**
 * Boot log shown on the monitor of the orbiting workstation (src/intro).
 *
 * These used to play in a full-screen BootSequence overlay before the terminal
 * appeared. The orbit landing replaced that overlay, so the lines now type out
 * on the 3D screen while the visitor decides whether to fly in.
 */
export const BOOT_LINES = Object.freeze([
  'BIOS v2.4.1  Copyright (C) 2025 TeoCorp Systems',
  'CPU: Intel Core i9-13900K @ 5.8GHz  [OK]',
  'Memory: 64GB DDR5-6400  [OK]',
  'Initializing kernel modules...',
  'Loading personality.sh  [########] 100%  [OK]',
  'Checking clearance level... access granted  [OK]',
  'Starting J.A.R.V.I.S. compatibility layer  [OK]',
  'Mounting /home/teo/portfolio  [OK]',
  'Starting interactive shell...',
]);
