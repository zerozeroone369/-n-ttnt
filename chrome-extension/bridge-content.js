/**
 * Content script cầu nối giữa Web App (n-ttnt.vercel.app / localhost) và Background Service Worker.
 * Chỉ chuyển tiếp thông điệp hợp lệ cùng origin và tuyệt đối không đọc/xuất cookie trình duyệt.
 */
(() => {
  const ALLOWED_ORIGIN_RE = /^(?:https:\/\/n-ttnt\.vercel\.app|http:\/\/localhost(?::\d+)?|http:\/\/127\.0\.0\.1(?::\d+)?)$/i;
  if (!ALLOWED_ORIGIN_RE.test(window.location.origin)) return;

  const VERSION = chrome.runtime.getManifest()?.version || '1.0.0';

  function announceReady() {
    try {
      document.documentElement.dataset.snnBridgeInstalled = '1';
      document.documentElement.dataset.snnBridgeVersion = VERSION;
      window.postMessage(
        {
          source: 'snn-bridge-ext',
          type: 'BRIDGE_READY',
          version: VERSION
        },
        window.location.origin
      );
      window.dispatchEvent(new CustomEvent('snn-bridge-ready', { detail: { version: VERSION } }));
    } catch {
      // Ignore cross-context announcement failures
    }
  }

  announceReady();

  window.addEventListener('message', (event) => {
    if (event.source !== window || event.origin !== window.location.origin) return;
    const msg = event.data;
    if (!msg || typeof msg !== 'object' || msg.source !== 'snn-webapp') return;

    if (msg.type === 'PING_BRIDGE') {
      chrome.runtime.sendMessage({ type: 'PING' }, (resp) => {
        const lastErr = chrome.runtime.lastError;
        window.postMessage(
          {
            source: 'snn-bridge-ext',
            type: 'BRIDGE_PONG',
            requestId: msg.requestId || '',
            ok: !lastErr && Boolean(resp?.ok),
            version: resp?.version || VERSION,
            shopeeTabs: Number(resp?.shopeeTabs || 0)
          },
          window.location.origin
        );
      });
      return;
    }

    if (msg.type === 'OPEN_SHOPEE_TAB') {
      chrome.runtime.sendMessage({ type: 'OPEN_SHOPEE_TAB', url: msg.url || 'https://shopee.vn/buyer/login' });
      return;
    }

    if (msg.type === 'START_BRIDGE_SCRAPE') {
      const requestId = String(msg.requestId || '');
      const port = chrome.runtime.connect({ name: 'snn-bridge-scrape' });
      let settled = false;

      const forwardToPage = (payload) => {
        window.postMessage(
          {
            source: 'snn-bridge-ext',
            requestId,
            ...payload
          },
          window.location.origin
        );
      };

      port.onMessage.addListener((workerMsg) => {
        if (!workerMsg || typeof workerMsg !== 'object') return;
        if (workerMsg.type === 'PROGRESS') {
          forwardToPage({ type: 'BRIDGE_PROGRESS', line: workerMsg.line || '' });
        } else if (workerMsg.type === 'COMPLETE') {
          settled = true;
          forwardToPage({ type: 'BRIDGE_COMPLETE', entries: workerMsg.entries || [] });
          try {
            port.disconnect();
          } catch {
            // ignore
          }
        } else if (workerMsg.type === 'ERROR') {
          settled = true;
          forwardToPage({ type: 'BRIDGE_ERROR', error: workerMsg.error || 'Lỗi từ Chrome Extension.' });
          try {
            port.disconnect();
          } catch {
            // ignore
          }
        }
      });

      port.onDisconnect.addListener(() => {
        if (!settled) {
          const err = chrome.runtime.lastError?.message;
          forwardToPage({
            type: 'BRIDGE_ERROR',
            error: err || 'Kết nối tới Service Worker của Extension bị ngắt giữa chừng.'
          });
        }
      });

      port.postMessage({
        type: 'START_SCRAPE',
        requestId,
        keywords: Array.isArray(msg.keywords) ? msg.keywords : [],
        limit: Number(msg.limit) || 20
      });
    }
  });
})();
