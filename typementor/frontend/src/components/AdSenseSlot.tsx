import { useEffect, useRef } from 'react';

type AdSenseSlotProps = {
  slot: string | undefined;
  className?: string;
};

const publisherId = (import.meta.env.VITE_ADSENSE_CLIENT || '').trim();

function loadAdSenseScript(client: string): Promise<void> {
  return new Promise((resolve) => {
    const scriptId = 'google-adsense-script';
    if (document.getElementById(scriptId)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.id = scriptId;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
    script.onload = () => resolve();
    script.onerror = () => resolve(); // Silently fail (e.g. ad-blocker)
    document.head.appendChild(script);
  });
}

export default function AdSenseSlot({ slot, className = '' }: AdSenseSlotProps) {
  const adRef = useRef<HTMLModElement>(null);
  const slotId = (slot || '').trim();
  const pushed = useRef(false);

  useEffect(() => {
    if (!publisherId || !slotId || !adRef.current || pushed.current) return;

    // Load the AdSense script first, then push the ad unit
    loadAdSenseScript(publisherId).then(() => {
      if (!adRef.current || pushed.current) return;
      try {
        const w = window as Window & { adsbygoogle?: unknown[] };
        w.adsbygoogle = w.adsbygoogle || [];
        w.adsbygoogle.push({});
        pushed.current = true;
      } catch {
        // Silently ignore — ad blockers throw here
      }
    });
  }, [slotId]);

  // Don't render anything until AdSense is configured
  if (!publisherId || !slotId) return null;

  return (
    <aside className={`adsense-slot ${className}`} aria-label="Advertisement">
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={publisherId}
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
