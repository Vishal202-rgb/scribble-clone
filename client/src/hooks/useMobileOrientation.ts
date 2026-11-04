import { useState, useEffect, useCallback } from 'react';

export interface MobileOrientationState {
  isLandscape: boolean;
  isSimulatedLandscape: boolean;
  isSupported: boolean;
  toggleLandscape: () => Promise<void>;
  enterLandscape: () => Promise<void>;
  exitLandscape: () => Promise<void>;
}

export const useMobileOrientation = (): MobileOrientationState => {
  const [isManualLandscape, setIsManualLandscape] = useState<boolean>(false);
  const [isSimulatedLandscape, setIsSimulatedLandscape] = useState<boolean>(false);
  const [isPhysicalLandscape, setIsPhysicalLandscape] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth > window.innerHeight && window.innerWidth < 1024;
  });

  const isSupported = typeof window !== 'undefined' && 'screen' in window && 'orientation' in window.screen;

  // Track physical device orientation changes (resize / orientationchange)
  useEffect(() => {
    const handleOrientationOrResize = () => {
      const isWide = window.innerWidth > window.innerHeight && window.innerWidth < 1024;
      setIsPhysicalLandscape(isWide);

      // If the device is physically in landscape now, simulated CSS rotation is no longer needed
      if (window.innerWidth > window.innerHeight) {
        setIsSimulatedLandscape(false);
      }
    };

    window.addEventListener('resize', handleOrientationOrResize);
    window.addEventListener('orientationchange', handleOrientationOrResize);

    const handleFullscreenChange = () => {
      // If user exited fullscreen manually while in manual landscape, keep layout consistent
      if (!document.fullscreenElement && isManualLandscape && window.innerWidth <= window.innerHeight) {
        setIsSimulatedLandscape(true);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      window.removeEventListener('resize', handleOrientationOrResize);
      window.removeEventListener('orientationchange', handleOrientationOrResize);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isManualLandscape]);

  const enterLandscape = useCallback(async () => {
    setIsManualLandscape(true);

    let orientationLockSucceeded = false;

    try {
      // 1. Try Screen Orientation API (often requires fullscreen on mobile Chrome/Android)
      if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
        await document.documentElement.requestFullscreen().catch(() => {});
      }

      if (screen.orientation && 'lock' in screen.orientation) {
        await (screen.orientation as any).lock('landscape').then(() => {
          orientationLockSucceeded = true;
        }).catch(() => {
          orientationLockSucceeded = false;
        });
      }
    } catch (_) {
      orientationLockSucceeded = false;
    }

    // 2. Graceful CSS fallback: If physical orientation is still portrait, activate simulated landscape
    setTimeout(() => {
      if (window.innerWidth <= window.innerHeight && !orientationLockSucceeded) {
        setIsSimulatedLandscape(true);
      } else {
        setIsSimulatedLandscape(false);
      }
    }, 150);
  }, []);

  const exitLandscape = useCallback(async () => {
    setIsManualLandscape(false);
    setIsSimulatedLandscape(false);

    try {
      if (screen.orientation && 'unlock' in screen.orientation) {
        (screen.orientation as any).unlock();
      }
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen().catch(() => {});
      }
    } catch (_) {}
  }, []);

  const toggleLandscape = useCallback(async () => {
    if (isManualLandscape || isPhysicalLandscape) {
      await exitLandscape();
    } else {
      await enterLandscape();
    }
  }, [isManualLandscape, isPhysicalLandscape, enterLandscape, exitLandscape]);

  const isLandscape = isManualLandscape || isPhysicalLandscape;

  return {
    isLandscape,
    isSimulatedLandscape,
    isSupported,
    toggleLandscape,
    enterLandscape,
    exitLandscape
  };
};

export default useMobileOrientation;
