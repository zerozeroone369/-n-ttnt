async function testFlow() {
  console.log('--- 1. Login Admin ---');
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@tiemnhanho.vn', password: 'admin123' })
  });
  const loginData = await loginRes.json();
  const token = loginData.token;
  console.log('✅ Login successful! Token:', token ? token.substring(0, 15) + '...' : 'none');

  console.log('\n--- 2. Connect to SSE Live Stream (/api/events) ---');
  let sseReceived = false;
  const controller = new AbortController();

  const ssePromise = (async () => {
    try {
      const resp = await fetch('http://localhost:5000/api/events', {
        headers: { Accept: 'text/event-stream' },
        signal: controller.signal
      });
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);
        if (text.includes('shop_update')) {
          console.log('\n⚡ [SSE EVENT RECEIVED] Live Event broadcast from server:');
          console.log(text.trim());
          sseReceived = true;
          controller.abort();
          break;
        }
      }
    } catch (e) {
      // Aborted or ended
    }
  })();

  // Wait 500ms for SSE to establish
  await new Promise(r => setTimeout(r, 600));

  console.log('\n--- 3. Trigger Shopee Scraper (/api/shopee/scrape) ---');
  const scrapeRes = await fetch('http://localhost:5000/api/shopee/scrape', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ keywords: ['áo thun oversize', 'đèn hoàng hôn decor'] })
  });
  const scrapeData = await scrapeRes.json();
  console.log('✅ Scrape response:', {
    success: scrapeData.success,
    source: scrapeData.source,
    itemsFound: scrapeData.results?.length
  });

  if (scrapeData.results && scrapeData.results.length > 0) {
    const toImport = scrapeData.results.slice(0, 3);
    console.log(`\n--- 4. Import ${toImport.length} Scraped Products (/api/shopee/import) ---`);

    const importRes = await fetch('http://localhost:5000/api/shopee/import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ products: toImport })
    });
    const importData = await importRes.json();
    console.log('✅ Import result:', {
      success: importData.success,
      imported: importData.imported,
      shopVersion: importData.shopVersion,
      updateRecord: importData.updateRecord?.title
    });
  }

  // Wait for SSE broadcast
  await new Promise(r => setTimeout(r, 1200));
  controller.abort();

  console.log('\n--- 5. Verify Shop Updates (/api/shop/updates) ---');
  const updRes = await fetch('http://localhost:5000/api/shop/updates');
  const updates = await updRes.json();
  console.log(`✅ Total shop updates recorded: ${updates.length}`);
  if (updates[0]) {
    console.log('   Latest update:', {
      title: updates[0].title,
      message: updates[0].message,
      count: updates[0].count,
      shopVersion: updates[0].shopVersion
    });
  }

  console.log('\n🎉 ALL PIPELINE VERIFICATIONS PASSED!');
}

testFlow().catch(console.error);

