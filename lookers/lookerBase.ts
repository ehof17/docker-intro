import * as puppeteer from "puppeteer";
import type { Browser, Page } from "puppeteer";
import { solutionResult } from "../utils/types";

export default abstract class Looker {
  private browserPromise: Promise<Browser>;
  private browser: Browser | null = null;
  private page: Page | null = null;

  // child looker classes must implement
  protected abstract getStartUrl(): string;

  public abstract getSolution(): Promise<solutionResult[]>;


  constructor() {
    this.browserPromise = puppeteer.launch({
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
      defaultViewport: { width: 1280, height: 800 },
    });
  }

  async init(): Promise<void> {
    this.browser = await this.browserPromise;
    this.page = await this.browser.newPage();
  }

  private async launchIfNeeded() {
    if (this.browser && this.browser.isConnected()) return;
    this.browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
      defaultViewport: { width: 1280, height: 800 },
    });
  }

    async open(): Promise<{ context: puppeteer.BrowserContext; page: Page }> {
      await this.launchIfNeeded();
      const context = await this.browser!.createBrowserContext();
      await this.init();
      const page = this.getPage();
      await page.goto(this.getStartUrl(), { waitUntil: "networkidle2" });
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3"
      );
      await page.setViewport({ width: 1280, height: 800 });
      await page.reload({ waitUntil: ["networkidle2"] });
      return { context, page };
    }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }

  protected async closeContext(context: puppeteer.BrowserContext) {
    try { await context.close(); } catch {}
  }

  async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getPage(): Page {
    if (!this.page) throw new Error("Call init() before accessing the page.");
    return this.page;
  }
}

