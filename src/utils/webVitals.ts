import { onCLS, onINP, onLCP, type Metric } from 'web-vitals';
import { trackEvent } from './umami';

function sendToUmami(metric: Metric) {
  if (!import.meta.env.PROD) return;

  let retries = 0;
  const maxRetries = 10; // 最多等待 5 秒，避免脚本加载失败时无限重试

  const report = () => {
    if (window.umami) {
      trackEvent('web-vitals', {
        metric: metric.name,
        value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
        rating: metric.rating,
      });
    } else if (retries < maxRetries) {
      retries += 1;
      setTimeout(report, 500);
    }
  };

  report();
}

export function initWebVitals() {
  if (!import.meta.env.PROD) return;

  onCLS(sendToUmami);
  onINP(sendToUmami);
  onLCP(sendToUmami);
}
