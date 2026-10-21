/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, useReducedMotion } from 'motion/react';

interface Props {
  /** SVG data URL from `codexArtUrl` / `cellArtUrl`. */
  src: string;
  size: number;
  /** Not discovered yet: shown as a dark silhouette, standing still. */
  locked?: boolean;
  /** Stagger for lists, in seconds. */
  delay?: number;
  /** Larger, livelier drift (detail views). */
  lively?: boolean;
}

/**
 * A cell or microbe from the game's artwork, animated like it's floating in
 * plasma: it springs in, then drifts and turns gently. Respects the system
 * "reduce motion" setting by keeping it still.
 */
export default function OrganismArt({ src, size, locked = false, delay = 0, lively = false }: Props) {
  const reduce = useReducedMotion();
  const idle = !reduce && !locked;
  const drift = lively ? 5 : 2.5;
  const turn = lively ? 8 : 5;
  return (
    <motion.img
      src={src}
      alt=""
      aria-hidden="true"
      draggable={false}
      width={size}
      height={size}
      className="shrink-0 select-none pointer-events-none"
      style={locked ? { filter: 'brightness(0) invert(0.18)' } : undefined}
      initial={reduce ? false : { opacity: 0, scale: 0.6 }}
      animate={idle
        ? { opacity: 1, scale: 1, y: [0, -drift, 0, drift * 0.6, 0], rotate: [0, turn, 0, -turn, 0] }
        : { opacity: locked ? 0.7 : 1, scale: 1, y: 0, rotate: 0 }}
      transition={{
        opacity: { duration: 0.25, delay },
        scale: { type: 'spring', stiffness: 300, damping: 20, delay },
        y: idle ? { duration: 6 + (delay * 7) % 2, repeat: Infinity, ease: 'easeInOut', delay } : { duration: 0.3 },
        rotate: idle ? { duration: 9 + (delay * 11) % 3, repeat: Infinity, ease: 'easeInOut', delay } : { duration: 0.3 },
      }}
    />
  );
}
