document.addEventListener('DOMContentLoaded', () => {
  const statusEl = document.getElementById('shopee-status');
  const noteEl = document.getElementById('shopee-note');

  chrome.tabs.query({ url: 'https://shopee.vn/*' }, (tabs) => {
    const list = Array.isArray(tabs) ? tabs : [];
    const loggedLikely = list.some((t) => t.url && !/\/buyer\/login|\/verify\//i.test(t.url));
    if (list.length > 0 && loggedLikely) {
      statusEl.textContent = `Đang mở (${list.length} tab)`;
      statusEl.className = 'badge ok';
      noteEl.textContent = 'Extension sẵn sàng dùng phiên Shopee đang mở với tốc độ 1-2 giây.';
    } else {
      statusEl.textContent = 'Chưa mở tab Shopee';
      statusEl.className = 'badge warn';
      noteEl.textContent = 'Extension vẫn cào được qua tab nền, hoặc bạn có thể mở shopee.vn đăng nhập trước.';
    }
  });

  document.getElementById('open-shopee').addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://shopee.vn/', active: true });
  });

  document.getElementById('open-admin-prod').addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://n-ttnt.vercel.app/', active: true });
  });
});
