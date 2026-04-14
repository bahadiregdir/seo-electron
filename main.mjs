// SEO Stealth Suite - v1.0.0
import { app, BrowserWindow, ipcMain } from 'electron';
import pkgUpdate from 'electron-updater';
const { autoUpdater } = pkgUpdate;
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import * as db from './database.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

puppeteer.use(StealthPlugin());

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 15, y: 15 },
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();
  if (process.env.NODE_ENV !== 'development') {
    autoUpdater.checkForUpdatesAndNotify();
  }
});

// Update Events
autoUpdater.on('update-available', () => {
  mainWindow.webContents.send('update_available');
});
autoUpdater.on('update-downloaded', () => {
  mainWindow.webContents.send('update_downloaded');
});

ipcMain.handle('quit-and-install', () => {
  autoUpdater.quitAndInstall();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// Helper for random delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper for result extraction logic (Shared across pages)
async function extractResults(page, startingRank, seenLinks) {
  return await page.evaluate((startRank, linksSoFar) => {
    const items = [];
    const internalSeen = new Set(linksSoFar);
    
    // Better selectors based on 2024/2025 Google DOM
    const searchResults = document.querySelectorAll('div.g, div.MjjYud, div.tF2Cxc');
    
    let currentRank = startRank;
    searchResults.forEach(el => {
      const titleEl = el.querySelector('h3');
      const linkEl = el.querySelector('a[data-ved], a.zReHs, div.yuRUbf a');
      const snippetEl = el.querySelector('div.VwiC3b, .VwiC3b, .yXK7ab');

      if (titleEl && linkEl) {
        const href = linkEl.href;
        if (!href || href.startsWith('https://webcache') || href.startsWith('https://translate')) return;
        
        if (internalSeen.has(href)) return;
        internalSeen.add(href);

        items.push({
          rank: currentRank++,
          title: titleEl.innerText,
          link: href,
          snippet: snippetEl ? snippetEl.innerText : '',
          domain: new URL(href).hostname
        });
      }
    });
    return items;
  }, startingRank, Array.from(seenLinks));
}

// Helper to check for CAPTCHA
async function checkForCaptcha(page) {
  return await page.evaluate(() => {
    return !!(document.querySelector('#captcha-form') || 
              document.querySelector('iframe[title*="reCAPTCHA"]') ||
              document.querySelector('.g-recaptcha') ||
              document.title.includes('Pardon') ||
              document.body.innerText.includes('Sistemlerimiz alışılmadık bir trafik algıladı'));
  });
}

// --- SERP Tracker Logic ---
ipcMain.handle('run-scraper', async (event, { keyword, device, country, language, targetDomain, headed, depth = 10 }) => {
  let browser;
  try {
    const userDataDir = path.join(__dirname, '.user-data');
    browser = await puppeteer.launch({
      headless: !headed,
      userDataDir,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--disable-infobars',
        '--window-size=1440,900',
        '--start-maximized',
        '--lang=en-US,en;q=0.9',
      ],
      defaultViewport: null,
      ignoreDefaultArgs: ['--enable-automation']
    });

    const page = await browser.newPage();

    if (device === 'mobile') {
      await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1');
      await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
    } else {
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');
      await page.setViewport({ width: 1440, height: 900 });
    }

    const allResults = [];
    const seenLinks = new Set();
    const pagesToScrape = Math.ceil(depth / 10);

    for (let i = 0; i < pagesToScrape; i++) {
      const start = i * 10;

      if (i === 0) {
        const homeUrl = `https://www.google.com/?gl=${country}&hl=${language}`;
        await page.goto(homeUrl, { waitUntil: 'networkidle2' });
        try {
          const consentButton = await page.$('button[aria-label="Accept all"], button[aria-label="Tümünü kabul et"], #L2AGLb');
          if (consentButton) {
            await consentButton.click();
            await delay(1000 + Math.random() * 1000);
          }
        } catch (e) {}

        const searchInput = await page.waitForSelector('textarea[name="q"], input[name="q"]', { timeout: 10000 });
        await searchInput.click();
        for (const char of keyword) {
          await page.keyboard.sendCharacter(char);
          await delay(50 + Math.random() * 100);
        }
        await page.keyboard.press('Enter');
      } else {
        await delay(2000 + Math.random() * 3000);
        const nextUrl = `https://www.google.com/search?q=${encodeURIComponent(keyword)}&gl=${country}&hl=${language}&start=${start}`;
        await page.goto(nextUrl, { waitUntil: 'networkidle2' });
      }

      await Promise.race([
        page.waitForSelector('#search, div.g', { timeout: 30000 }),
        page.waitForSelector('#captcha-form, .g-recaptcha', { timeout: 30000 })
      ]).catch(() => {});

      const isCaptcha = await checkForCaptcha(page);
      if (isCaptcha) {
        if (!headed) {
          await browser.close();
          return { success: false, error: 'CAPTCHA_DETECTED' };
        }
        await page.waitForSelector('#search, #res, #botstuff', { timeout: 300000 }).catch(() => {});
      }

      const pageResults = await extractResults(page, allResults.length + 1, seenLinks);
      pageResults.forEach(r => {
        allResults.push(r);
        seenLinks.add(r.link);
      });

      if (allResults.length >= depth) break;
    }

    if (!headed || allResults.length > 0) {
      await browser.close();
    }

    db.saveScan({ keyword, device, country, language, targetDomain }, allResults);
    return { success: true, results: allResults };

  } catch (error) {
    if (browser) await browser.close();
    return { success: false, error: error.message };
  }
});

// --- Keyword Explorer Logic ---
ipcMain.handle('run-keyword-explorer', async (event, { keyword, language }) => {
  try {
    const chars = ['', ...'abcdefghijklmnopqrstuvwxyz', ...'0123456789'];
    const allSuggestions = new Set();
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

    for (const char of chars) {
      const query = char ? `${keyword} ${char}` : keyword;
      const url = `https://suggestqueries.google.com/complete/search?output=toolbar&hl=${language}&q=${encodeURIComponent(query)}`;
      
      try {
        const response = await axios.get(url);
        const jsonObj = parser.parse(response.data);
        const suggestions = jsonObj.toplevel?.CompleteSuggestion;
        
        if (suggestions) {
          const items = Array.isArray(suggestions) ? suggestions : [suggestions];
          items.forEach(item => {
            const suggestion = item.suggestion?.["@_data"];
            if (suggestion) allSuggestions.add(suggestion);
          });
        }
        // Small delay to be polite
        await delay(200 + Math.random() * 300);
      } catch (err) {
        console.error(`Explorer error for query "${query}":`, err.message);
      }
    }

    const finalResults = Array.from(allSuggestions);
    db.saveExplorer(keyword, finalResults);
    return { success: true, results: finalResults };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// --- PAA Miner Logic ---
ipcMain.handle('run-paa-miner', async (event, { keyword, country, language, headed }) => {
  let browser;
  try {
    const userDataDir = path.join(__dirname, '.user-data');
    browser = await puppeteer.launch({ 
      headless: !headed, 
      userDataDir,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');
    
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(keyword)}&gl=${country}&hl=${language}`;
    await page.goto(searchUrl, { waitUntil: 'networkidle2' });

    await page.waitForSelector('div[data-q]', { timeout: 10000 }).catch(() => {});

    // Recursive Expansion Function
    const scrapePAA = async (depth = 0, maxDepth = 2) => {
      const results = [];
      const questions = await page.$$('div[data-q]');
      
      // Click top 4 questions to expand
      const toProcess = questions.slice(0, 4);
      for (const qEl of toProcess) {
        try {
          const qText = await page.evaluate(el => el.getAttribute('data-q'), qEl);
          if (!qText) continue;

          // Click to expand
          await qEl.click();
          await delay(800 + Math.random() * 700);

          // Find the answer snippet and link for THIS question
          // Google usually puts the answer in a sibling or descendant div when expanded
          const answerData = await page.evaluate((question) => {
            const block = document.querySelector(`div[data-q="${question}"]`);
            if (!block) return null;
            
            const parent = block.parentElement;
            const snippet = parent.querySelector('.L_VfKb, .clJ9ec, .hgK60e, .VwiC3b');
            const link = parent.querySelector('a');
            
            return {
              question,
              answer: snippet ? snippet.innerText : 'Cevap bulunamadı.',
              link: link ? link.href : ''
            };
          }, qText);

          if (answerData) results.push(answerData);
        } catch (e) {
          console.error('PAA expand error:', e.message);
        }
      }
      return results;
    };

    const finalResults = await scrapePAA();

    await browser.close();
    db.savePAA(keyword, finalResults);
    return { success: true, results: finalResults };
  } catch (error) {
    if (browser) await browser.close();
    return { success: false, error: error.message };
  }
});

// --- Site Auditor Logic ---
ipcMain.handle('run-site-auditor', async (event, { url }) => {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    const auditData = await page.evaluate(() => {
      const h1s = Array.from(document.querySelectorAll('h1')).map(h => h.innerText.trim());
      const h2s = Array.from(document.querySelectorAll('h2')).map(h => h.innerText.trim());
      const h3s = Array.from(document.querySelectorAll('h3')).map(h => h.innerText.trim());
      const imgs = Array.from(document.querySelectorAll('img'));
      const imgsWithoutAlt = imgs.filter(img => !img.alt || img.alt.trim() === '').length;

      return {
        title: document.title,
        description: document.querySelector('meta[name="description"]')?.content || 'Bulunamadı',
        h1Count: h1s.length,
        h1s,
        h2Count: h2s.length,
        h3Count: h3s.length,
        imageCount: imgs.length,
        imagesMissingAlt: imgsWithoutAlt,
        canonical: document.querySelector('link[rel="canonical"]')?.href || 'Bulunamadı'
      };
    });

    await browser.close();
    db.saveAudit(url, auditData);
    return { success: true, results: auditData };
  } catch (error) {
    if (browser) await browser.close();
    return { success: false, error: error.message };
  }
});

// --- History Handlers ---
ipcMain.handle('get-history', async () => db.getHistory());
ipcMain.handle('get-scan-results', async (event, scanId) => db.getScanResults(scanId));
ipcMain.handle('delete-scan', async (event, scanId) => db.deleteScan(scanId));
ipcMain.handle('get-explorer-history', async () => db.getExplorerHistory());
ipcMain.handle('get-paa-history', async () => db.getPAAHistory());
ipcMain.handle('get-audit-history', async () => db.getAuditHistory());
