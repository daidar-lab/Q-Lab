import puppeteer from 'puppeteer';
import { Semaphore } from 'async-mutex';

const sem = new Semaphore(1);

export async function renderizarPDF(html: string): Promise<Buffer> {
  const [, release] = await sem.acquire();
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    });

    const page = await browser.newPage();
    // 'networkidle2' is not a valid waitUntil option for setContent.
    // Use 'load' or 'domcontentloaded' instead.
    await page.setContent(html, { waitUntil: 'load', timeout: 60000 });
    
    // Se for necessário aguardar o carregamento de fontes ou scripts externos:
    await page.waitForNetworkIdle({ idleTime: 500, timeout: 60000 }).catch(() => {});

    const buffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
    });

    await browser.close();
    return Buffer.from(buffer);
  } finally {
    release();
  }
}
