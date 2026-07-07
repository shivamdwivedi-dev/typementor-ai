/**
 * monitoring.ts
 * Lightweight, zero-dependency telemetry wrapper for Google Analytics 4,
 * Microsoft Clarity, and Sentry (via CDN).
 *
 * All services are environment-variable driven and automatically disabled
 * in development or if their respective environment keys are missing.
 */

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
    clarity: (...args: any[]) => void;
    Sentry?: {
      init: (options: any) => void;
      captureException: (error: any) => void;
      captureMessage: (msg: string) => void;
    };
  }
}

const IS_PROD = import.meta.env.PROD;
const GA_ID = (import.meta.env.VITE_GA_MEASUREMENT_ID || '').trim();
const CLARITY_ID = (import.meta.env.VITE_CLARITY_PROJECT_ID || '').trim();
const SENTRY_DSN = (import.meta.env.VITE_SENTRY_DSN || '').trim();

/**
 * Initializes GA4, Clarity, and Sentry scripts asynchronously.
 */
export function initMonitoring() {
  if (!IS_PROD) {
    console.info('[Monitoring] Disabled in development mode.');
    return;
  }

  // 1. Google Analytics 4
  if (GA_ID) {
    try {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
      document.head.appendChild(script);

      window.dataLayer = window.dataLayer || [];
      window.gtag = function gtag() {
        window.dataLayer.push(arguments);
      };
      window.gtag('js', new Date());
      window.gtag('config', GA_ID, {
        send_page_view: false, // Page views will be tracked manually via React Router
      });
      console.info(`[Monitoring] GA4 initialized: ${GA_ID}`);
    } catch (e) {
      console.error('[Monitoring] Failed to initialize GA4:', e);
    }
  }

  // 2. Microsoft Clarity
  if (CLARITY_ID) {
    try {
      const script = document.createElement('script');
      script.async = true;
      script.type = 'text/javascript';
      script.text = `
        (function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        })(window,document,"clarity","script","${CLARITY_ID}");
      `;
      document.head.appendChild(script);
      console.info(`[Monitoring] Microsoft Clarity initialized: ${CLARITY_ID}`);
    } catch (e) {
      console.error('[Monitoring] Failed to initialize Clarity:', e);
    }
  }

  // 3. Sentry via CDN
  if (SENTRY_DSN) {
    try {
      const script = document.createElement('script');
      script.src = 'https://browser.sentry-cdn.com/8.1.0/bundle.min.js';
      script.crossOrigin = 'anonymous';
      script.onload = () => {
        if (window.Sentry) {
          window.Sentry.init({
            dsn: SENTRY_DSN,
            tracesSampleRate: 0.1,
            replaysSessionSampleRate: 0.05,
            replaysOnErrorSampleRate: 1.0,
            environment: 'production',
          });
          console.info(`[Monitoring] Sentry initialized successfully.`);
        }
      };
      document.head.appendChild(script);
    } catch (e) {
      console.error('[Monitoring] Failed to load Sentry script:', e);
    }
  }
}

/**
 * Tracks a page view event.
 */
export function trackPageView(pagePath: string) {
  if (!IS_PROD) {
    console.info(`[Analytics PageView] -> ${pagePath}`);
    return;
  }
  if (GA_ID && window.gtag) {
    window.gtag('event', 'page_view', {
      page_path: pagePath,
      page_title: document.title,
    });
  }
}

/**
 * Tracks custom events (e.g. typing stats, lesson completion).
 */
export function trackEvent(
  action: string,
  category: string,
  label?: string,
  value?: number
) {
  if (!IS_PROD) {
    console.info(`[Analytics Event] ${category} / ${action} - ${label || ''} : ${value || ''}`);
    return;
  }
  if (GA_ID && window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
}

/**
 * Captures exceptions to Sentry and Google Analytics.
 */
export function trackException(error: Error | any, fatal = false) {
  if (!IS_PROD) {
    console.error('[Exception Logged]', error);
    return;
  }

  // Capture in Sentry
  if (window.Sentry) {
    window.Sentry.captureException(error);
  }

  // Capture in GA4
  if (GA_ID && window.gtag) {
    window.gtag('event', 'exception', {
      description: error?.message || String(error),
      fatal: fatal,
    });
  }
}
