import * as puppeteer from "puppeteer";
import type { Browser, Page } from "puppeteer";
import { solutionResult } from "../utils/types";

export default abstract class Looker {
  private browserPromise?: Promise<Browser>;
  private browser: Browser | null = null;
  private page: Page | null = null;

  protected abstract siteName(): string;
  protected abstract startUrl(): string;
  protected abstract archiveUrl(gameId: string): string;
  protected abstract validateLoaded(page: Page, args: { gameId?: string }): Promise<void>;
  protected abstract loseGame(page: Page): Promise<void>;
  protected abstract scrapeSolution(page: Page): Promise<any[]>;

  constructor() {
    this.installSignalHandlers();
  }
  private installSignalHandlers() {
    const tidy = async () => { try { await this.close(); } catch {} };
    process.on("exit", tidy);
    process.on("SIGINT", async () => { await tidy(); process.exit(130); });
    process.on("SIGTERM", async () => { await tidy(); process.exit(143); });
    process.on("uncaughtException", async (e) => { console.error(e); await tidy(); process.exit(1); });
  }

  private async getBrowser(): Promise<Browser> {
    if (this.browser && this.browser.isConnected()) return this.browser;
    if (this.browserPromise) this.browser = await this.browserPromise;

    if (!this.browser || !this.browser.isConnected()) {
      this.browserPromise = puppeteer.launch({
        args: ["--no-sandbox", "--disable-dev-shm-usage"],
        protocolTimeout: 120_000, 
        defaultViewport: { width: 1280, height: 800 },
      });
      this.browser = await this.browserPromise;
    }
    return this.browser;
  }
  
  async open(url: string): Promise<{ context: puppeteer.BrowserContext; page: Page }> {
    const browser = await this.getBrowser();
    const context = await browser.createBrowserContext();
    const page = await context.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );
    await page.setViewport({ width: 1280, height: 800 });
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(45000);

    await page.goto(url, { waitUntil: "networkidle2" });
    await page.waitForFunction(() => document.readyState === "complete", { timeout: 30000 });
    return { context, page };
  }

  async close(): Promise<void> {
    if (this.browser) {
      try {
        await this.browser.close();
      } catch {
        // force-kill as a last resort
        try { this.browser.process()?.kill("SIGKILL"); } catch {}
      } finally {
        this.browser = null;
        this.browserPromise = undefined;
      }
    }
  }

  async safeClickByIndex(
    page: Page,
    parentSelector: string,
    childCss: string,   // e.g. ":scope > div"
    index: number       // 0-based
  ) {
    // 1) Re-query fresh nodes
    const parent = await page.$(parentSelector);
    if (!parent) throw new Error(`[safeClick] Parent not found: ${parentSelector}`);
  
    const items = await parent.$$(childCss);
    if (index < 0 || index >= items.length) {
      throw new Error(`[safeClick] Index ${index} out of bounds (len=${items.length})`);
    }
    const el = items[index];
  
    // 2) Bring to front & scroll into view
    await page.bringToFront();
    await el.evaluate(node => (node as HTMLElement).scrollIntoView({ block: 'center', inline: 'center' }));
  
    // 3) Wait until it’s visible & not covered
    await page.waitForFunction((node: Element) => {
      const rect = (node as HTMLElement).getBoundingClientRect();
      const visible = rect.width > 0 && rect.height > 0;
      if (!visible) return false;
      // check clickable by hit-testing center
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const elAtPoint = document.elementFromPoint(cx, cy);
      return elAtPoint && (node === elAtPoint || (node as HTMLElement).contains(elAtPoint));
    }, { timeout: 5000 }, el);
  
    // 4) Try element click, then mouse click fallback, then DOM click
    try {
      await el.click({ delay: 50 });
    } catch {
      const box = await el.boundingBox();
      if (box) {
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { delay: 50 });
      } else {
        await page.evaluate(node => (node as HTMLElement).click(), el);
      }
    }
  }


  protected async closeContext(context: puppeteer.BrowserContext) {
    try {
      const pages = await context.pages();
      for (const p of pages) {
        try { await p.close({ runBeforeUnload: true }); } catch {}
      }
      await context.close();
    } catch {}
  }

  async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getPage(): Page {
    if (!this.page) throw new Error("Call init() before accessing the page.");
    return this.page;
  }

  async getSolution(): Promise<any[]> {
    const { context, page } = await this.open(this.startUrl());
    try {
      await this.validateLoaded(page, {});
      await this.loseGame(page);
      return await this.scrapeSolution(page);
    } finally {
      await this.closeContext(context);
    }
  }

  async getSolutionAtGameId(gameId: string): Promise<any[]> {
    const { context, page } = await this.open(this.archiveUrl(gameId));
    try {
      await this.validateLoaded(page, { gameId });
      await this.loseGame(page);
      return await this.scrapeSolution(page);
    } finally {
      await this.closeContext(context);
    }
  }
}

