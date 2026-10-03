import puppeteer, { LaunchOptions } from 'puppeteer';
import fs from 'fs';
import path from 'path';

/**
 * Recursively scans directory for a Chrome/Chromium executable binary
 */
function scanForChromeBinary(dir: string): string | undefined {
  if (!fs.existsSync(dir)) return undefined;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const found = scanForChromeBinary(full);
        if (found) return found;
      } else if (entry.isFile()) {
        const name = entry.name.toLowerCase();
        if (name === 'chrome' || name === 'chrome.exe' || name === 'chromium') {
          return full;
        }
      }
    }
  } catch {}
  return undefined;
}

/**
 * Searches for known Chrome / Chromium binaries on Linux, Render, Docker, or Windows
 */
async function findSystemChromeExecutable(): Promise<string | undefined> {
  // 1. Check env vars first
  const envPath = process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_BIN || process.env.CHROME_PATH;
  if (envPath && fs.existsSync(envPath)) return envPath;

  // 2. Try Puppeteer default executable path
  try {
    const defaultPathOrPromise = puppeteer.executablePath();
    const defaultPath = typeof (defaultPathOrPromise as any)?.then === 'function'
      ? await defaultPathOrPromise
      : defaultPathOrPromise;
    if (typeof defaultPath === 'string' && fs.existsSync(defaultPath)) {
      return defaultPath;
    }
  } catch {}

  // 3. Scan project-local and platform cache directories
  const searchDirs = [
    path.join(process.cwd(), '.cache', 'puppeteer'),
    path.join(__dirname, '..', '..', '.cache', 'puppeteer'),
    '/opt/render/.cache/puppeteer',
    path.join(process.env.HOME || '', '.cache', 'puppeteer'),
  ];

  for (const dir of searchDirs) {
    const scanned = scanForChromeBinary(dir);
    if (scanned) return scanned;
  }

  // 4. Standard Linux distribution binaries
  const standardBinaries = [
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ];

  for (const candidate of standardBinaries) {
    if (candidate && fs.existsSync(candidate)) {
      try {
        const stat = fs.statSync(candidate);
        if (stat.isFile()) return candidate;
      } catch {}
    }
  }

  return undefined;
}

/**
 * Converts an HTML string to a PDF Buffer using headless Chromium (puppeteer).
 * The resulting buffer is a valid PDF file suitable for email attachments.
 */
export async function htmlToPdfBuffer(html: string): Promise<Buffer> {
  const options: LaunchOptions = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-zygote',
      '--single-process',
      '--disable-extensions',
    ],
  };

  const systemPath = await findSystemChromeExecutable();
  if (systemPath) {
    options.executablePath = systemPath;
  }

  const browser = await puppeteer.launch(options);

  try {
    const page = await browser.newPage();

    // Set the HTML content — wait for 'load' then give fonts/images a moment to settle
    await page.setContent(html, { waitUntil: 'load', timeout: 30000 });
    // Small delay to allow any remaining layout reflows
    await new Promise((r) => setTimeout(r, 400));

    // Generate A4 PDF matching the @page { size: A4; margin: 8mm } in the template
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: { top: '8mm', right: '8mm', bottom: '8mm', left: '8mm' },
      printBackground: true,
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}
