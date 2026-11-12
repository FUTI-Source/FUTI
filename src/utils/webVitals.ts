import { onCLS, onINP, onLCP, type Metric } from 'web-vitals';
import { trackEvent } from './umami';

function sendToUmami(metric: Metric) {
  const report = () => {
    if (window.umami) {
      trackEvent('web-vitals', {
        metric: metric.name,
        value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
        rating: metric.rating,
      });
    } else {
      setTimeout(report, 500);
    }
  };

  report();
}

export function initWebVitals() {
  onCLS(sendToUmami);
  onINP(sendToUmami);
  onLCP(sendToUmami);
}
