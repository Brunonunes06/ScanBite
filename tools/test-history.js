const puppeteer = require('puppeteer');

(async () => {
  const url = process.argv[2] || 'http://localhost:3001/history.html';
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();

  page.on('console', msg => console.log('PAGE:', msg.text()));

  try {
    const response = await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
    console.log('Initial response status:', response && response.status());
    await page.waitForTimeout(1000);

    const finalUrl = page.url();
    console.log('FINAL_URL:', finalUrl);

    // Check if redirected to index.html
    if (finalUrl.endsWith('/index.html') || finalUrl.endsWith('/')) {
      console.error('TEST RESULT: Redirected to index.html (FAIL)');
      process.exitCode = 2;
    } else if (finalUrl.includes('history.html')) {
      console.log('TEST RESULT: Stayed on history.html (PASS)');
      process.exitCode = 0;
    } else {
      console.warn('TEST RESULT: Landed on unexpected URL');
      process.exitCode = 3;
    }
  } catch (err) {
    console.error('ERROR during test:', err.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();