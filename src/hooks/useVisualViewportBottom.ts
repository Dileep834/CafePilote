import { useEffect } from 'react';

const VISUAL_BOTTOM_VAR = '--cafepilots-visual-bottom';

export function useVisualViewportBottom() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateBottomInset = () => {
      const visualViewport = window.visualViewport;
      const bottomInset = visualViewport
        ? Math.max(0, window.innerHeight - visualViewport.height - visualViewport.offsetTop)
        : 0;

      document.documentElement.style.setProperty(VISUAL_BOTTOM_VAR, `${Math.round(bottomInset)}px`);
    };

    updateBottomInset();

    const visualViewport = window.visualViewport;
    visualViewport?.addEventListener('resize', updateBottomInset);
    visualViewport?.addEventListener('scroll', updateBottomInset);
    window.addEventListener('resize', updateBottomInset);
    window.addEventListener('orientationchange', updateBottomInset);

    return () => {
      visualViewport?.removeEventListener('resize', updateBottomInset);
      visualViewport?.removeEventListener('scroll', updateBottomInset);
      window.removeEventListener('resize', updateBottomInset);
      window.removeEventListener('orientationchange', updateBottomInset);
      document.documentElement.style.setProperty(VISUAL_BOTTOM_VAR, '0px');
    };
  }, []);
}
