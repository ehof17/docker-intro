import { Page } from "puppeteer";
import Looker from "./lookerBase";

export default class LeConnectionsHOFLooker extends Looker {
    constructor() {
      super();
    }
    protected siteName() { return "leconnectionshof"; }
    protected startUrl() { return "https://www.leconnections.app/hof"; }
    // HOF archive uses the same archive route as normal connections; IDs just start at 100001
    protected archiveUrl(gameId: string) { return `https://www.leconnections.app/archive/${gameId}`; }
    protected async validateLoaded(page: Page, args: { gameId?: string }) {
      if (args.gameId) {
        const gameIdInt = parseInt(args.gameId);
        if (gameIdInt < 100000){
          throw new Error(`Archive ${args.gameId} not compatible with hall of fame leConnections. Minumum game id is 100001`);
        }

        const stayedOnArchive = page.url().endsWith(`/archive/${args.gameId}`);
        if (!stayedOnArchive) {
          throw new Error(`Archive ${args.gameId} not released (navigated to ${page.url()})`);
        }
      } else {
        // HOF page has bigger board so gotta extend
        await page.setViewport({ width: 2560, height: 1600 }).catch(() => {});
        await page.waitForSelector("app-game-board", { timeout: 15000 });
      }
    }

    async loseGame(page:Page) {
        const giveupSelector = "::-p-xpath(/html/body/app-root/div/div[3]/div[2]/app-archive/div/div/app-game-board/div/div/div[3]/div[4]/button)";
        let giveUpButton = null;
    
        try {
          giveUpButton = await page.waitForSelector(giveupSelector, { timeout: 5000 });
        } catch {
          try {
            giveUpButton = await page.waitForSelector('button ::-p-text(Give up)', { timeout: 5000 });
          } catch {
            const buttons = await page.$$('button');
            for (const btn of buttons) {
              const text = await btn.evaluate(el => el.innerText);
              if (text.includes("Give up")) {
                giveUpButton = btn;
                break;
              }
            }
          }
        }
    
        if (giveUpButton) {
          console.log(`[loseGame]: Found give up button`);
          await giveUpButton.click({ delay: 1000 });
        } else {
          console.log(`[loseGame]: Could not find give up button`);
          await page.screenshot({ path: 'give_up_button_not_found.png' });
        }
    
        const confirmButtons = await page.$$('button ::-p-text(Give up)');
        if (confirmButtons.length > 1) {
          await confirmButtons[1].click({ delay: 1000 });
        } else if (confirmButtons.length === 1) {
          await confirmButtons[0].click({ delay: 1000 });
        } else {
          throw new Error("Confirm give up button not found");
        }
      }
      
    IsArchivePage(page:Page){
        const href = page.url();
        return href.toLowerCase().includes("archive");
    }
    async scrapeSolution(page:Page) {
        // if on the page of today, the component is app-game
        // otherwise it is app-archive
        
        // todo: support archive for all lookers
        // so in current functionality it will always be app-game but for archive handlers for later
        const gridBox = this.IsArchivePage(page) ? "app-archive" : "app-game"

        ///html/body/app-root/div/div[3]/div[2]/app-game/div/div/app-game-board/div/div/div[2]/div[8]
        const gridSelector = `::-p-xpath(/html/body/app-root/div/div[3]/div[2]/${gridBox}/div/div/app-game-board/div/div/div[1])`;
        await page.waitForSelector(gridSelector);
        const grid = await page.$(gridSelector);
        if (!grid){
            throw new Error("Grid not found");
        }
        const rows = await grid.$$(':scope > div');
        const result = [];
    
        for (let i = 0; i < 5; i++) await new Promise(res => setTimeout(res, 2000));
    
        for (let i = 0; i < rows.length; i++) {
          try {
            await rows[i].waitForSelector('span');
            const title = await rows[i].$eval('span', el => el.innerText.trim());
            const names = await rows[i].$$eval('div:nth-child(2) p', ps => ps.map(p => p.innerText.trim()));
            result.push({ title, players: names });
          } catch (error) {
            console.error(`Error processing row ${i + 1}:`, error);
            await page.screenshot({ path: `screenshots/${Date.now()}_error_row_${i + 1}.png` });
          }
        }
    
        return result;
      }
    }
module.exports = LeConnectionsHOFLooker;
