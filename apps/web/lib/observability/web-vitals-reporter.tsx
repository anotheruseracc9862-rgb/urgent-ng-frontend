'use client';

import { useReportWebVitals } from 'next/web-vitals';
import { reportWebVitals } from './web-vitals';

/** Mounted once in the root layout; sends Core Web Vitals through the same reporter. */
export function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    reportWebVitals({
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
    });
  });
  return null;
}
