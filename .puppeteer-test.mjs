import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

async function test() {
  console.log('Scraper testi başlatıldı...');
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  await page.goto('https://www.google.com/search?q=test');
  const title = await page.title();
  console.log('Sayfa başlığı:', title);
  await browser.close();
}

test().catch(console.error);
