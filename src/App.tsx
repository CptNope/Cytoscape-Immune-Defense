/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Game from './components/Game';
import LandingPage from './components/LandingPage';
import PWAUpdatePrompt from './components/PWAUpdatePrompt';

/** The game opens to the landing page; `#play` in the URL goes straight in. */
const startsInGame = () => typeof location !== 'undefined' && location.hash === '#play';

export default function App() {
  const [view, setView] = useState<'landing' | 'game'>(startsInGame() ? 'game' : 'landing');
  const runningRef = useRef(false);
  const onRunningChange = useCallback((running: boolean) => { runningRef.current = running; }, []);

  // Keep the URL in step so back/forward and shared links work
  useEffect(() => {
    const onHash = () => {
      // Back (or the Android back gesture) mid-run would throw the run away: stay in the game
      if (!startsInGame() && runningRef.current) {
        history.pushState(null, '', '#play');
        return;
      }
      setView(startsInGame() ? 'game' : 'landing');
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const go = (next: 'landing' | 'game') => {
    setView(next);
    const hash = next === 'game' ? '#play' : '';
    if (location.hash !== hash) history.pushState(null, '', hash || location.pathname + location.search);
  };

  return (
    <main className="w-full h-[100dvh]">
      {view === 'landing'
        ? <LandingPage onPlay={() => go('game')} />
        : <Game onHome={() => go('landing')} onRunningChange={onRunningChange} />}
      <PWAUpdatePrompt />
    </main>
  );
}
