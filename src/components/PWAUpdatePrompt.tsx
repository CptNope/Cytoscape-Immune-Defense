import { useRegisterSW } from 'virtual:pwa-register/react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw } from 'lucide-react';

declare const __APP_VERSION__: string;

export default function PWAUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      if (r) {
        // Check for updates every 60 seconds
        setInterval(() => {
          r.update();
        }, 60 * 1000);
      }
      console.log(`[PWA v${__APP_VERSION__}] SW registered: ${swUrl}`);
    },
    onRegisterError(error) {
      console.error('[PWA] SW registration error:', error);
    },
  });

  const close = () => {
    setNeedRefresh(false);
  };

  return (
    <AnimatePresence>
      {needRefresh && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-black/90 backdrop-blur-xl border border-emerald-500/30 rounded-2xl p-4 shadow-2xl shadow-emerald-500/10 max-w-sm w-[calc(100%-2rem)]"
        >
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">Update Available</p>
              <p className="text-xs text-white/50">New version ready to install</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={close}
                className="px-3 py-1.5 text-xs text-white/50 hover:text-white transition-colors"
              >
                Later
              </button>
              <button
                onClick={() => updateServiceWorker(true)}
                className="px-4 py-1.5 bg-emerald-500 text-black text-xs font-bold rounded-lg hover:bg-emerald-400 transition-colors"
              >
                Update
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
