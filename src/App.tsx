/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Game from './components/Game';
import PWAUpdatePrompt from './components/PWAUpdatePrompt';

export default function App() {
  return (
    <main className="w-full h-screen">
      <Game />
      <PWAUpdatePrompt />
    </main>
  );
}
