/**
 * Web Vitals tracking for performance monitoring.
 *
 * Not mounted: there is no /api/vitals sink yet, and posting to it returned 404. When a telemetry
 * destination exists, mount a `useReportWebVitals` component that calls this in the root layout.
 */

type Metric = {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
};

export function reportWebVitals(metric: Metric) {
  // Only report in production
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Web Vitals]', metric.name, metric.value, metric.rating);
    return;
  }

  // Send to analytics
  const body = JSON.stringify({
    name: metric.name,
    value: Math.round(metric.value),
    rating: metric.rating,
    delta: Math.round(metric.delta),
    id: metric.id,
    // Trusted-contact URLs contain a bearer secret, not a telemetry identifier.
    url: window.location.pathname.startsWith('/shared/') ? '/shared/[token]' : window.location.pathname,
  });

  // Use sendBeacon if available
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/vitals', body);
  } else {
    fetch('/api/vitals', {
      body,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      keepalive: true,
    });
  }
}
