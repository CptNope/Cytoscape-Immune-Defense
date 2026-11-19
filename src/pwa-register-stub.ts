/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Stand-in for `virtual:pwa-register/react` in the itch.io build, which ships without a
// service worker: itch hosts the game in an iframe on its own CDN, where offline caching
// and update prompts don't apply (itch delivers new versions itself).
import { useState } from 'react';

export function useRegisterSW(_options?: unknown) {
  const needRefresh = useState(false);
  const offlineReady = useState(false);
  return {
    needRefresh,
    offlineReady,
    updateServiceWorker: async (_reload?: boolean) => {},
  };
}
