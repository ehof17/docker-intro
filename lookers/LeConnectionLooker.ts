import { Page } from "puppeteer";
import Looker from "./lookerBase";

export default class LeConnectionsLooker extends Looker {
    constructor() {
      super();
    }
    protected siteName() { return "leconnections"; }
    protected startUrl() { return "https://www.leconnections.app/"; }
    protected archiveUrl(gameId: string) { return `https://www.leconnections.app/archive/${gameId}`; }

    protected async validateLoaded(page: Page, args: { gameId?: string }) {
      if (args.gameId) {
        // If SPA reroutes to home, this will not match:
        const stayedOnArchive = page.url().endsWith(`/archive/${args.gameId}`);
        if (!stayedOnArchive) throw new Error(`Archive ${args.gameId} not released (redirected to ${page.url()})`);
      } else {
        await page.waitForSelector("app-game-board", { timeout: 10000 });
      }
    }
  
    async loseGame(page:Page){
      const appToastSelector = 'app-toast';
  
      console.log(`[loseGame] Clicking Four Players`);
      await this.clickFourPlayers(page);
      console.log(`[loseGame] Clicking Submit`);
      await this.clickSubmit(page)
      console.log(`[loseGame] Waiting for 10 seconds before retrying`);
      await this.sleep(10000); 
      console.log(`[loseGame] Retrying 3 times`);
  
      // After clicking 4 players and submitting, we could have got a valid connection
      // So to determine what happend we try submitting again
      // Got it right - nobody would be selected anymore
      // Got it wrong - we get a toast message saying we already guessed this combination
      for (let i = 0; i < 3; i++) {
          console.log(`[loseGame] Attempt ${i + 1}`);
          await this.clickSubmit(page)
          console.log(`[loseGame] Clicked Submit`);
          console.log(`[loseGame] Trying to check toast message`);
          try{
                await page.waitForSelector(appToastSelector);
                const appToast = await page.$(appToastSelector);
                if (appToast) {
                  //no innerText
                  const toastText = await appToast.evaluate(el => el.innerHTML);
                  console.log(`[Toast] ${toastText}`);
          
                  if (toastText.includes("You need to select 4 players")) {
                    await this.clickFourPlayers(page);
                    await this.clickSubmit(page);
                  } else {
                    await this.clickSpecificPlayer(page, i + 1); // deselect first player
                    await this.clickSpecificPlayer(page, i + 5); // select a new player
                    await this.clickSubmit(page);
                  }
                } else {
                  console.log(`[Toast] No toast message found.`);
                }
              await this.sleep(5000);
          }
          catch (error) {
              console.log(`[loseGame] No toast message found, continuing...`);
              await this.clickSpecificPlayer(page, i+1); // deselect first player
              await this.clickSpecificPlayer(page, i+5); // select a new player
              await this.clickSubmit(page);
          }
  }}
  
    async scrapeSolution(page:Page) {

      // might need to change this
      const isArchive = page.url().toLowerCase().includes("archive");
  
      const losinggrid = isArchive
        ? "::-p-xpath(/html/body/app-root/div/div[3]/div[2]/app-archive/div/div/app-game-board/div/div/div[1])"
        : "::-p-xpath(/html/body/app-root/div/div[3]/div[2]/app-game/div/div/app-game-board/div/div/div[1])";

      await page.waitForSelector(losinggrid);
        const losingGrid = await page.$(losinggrid);
        if (!losingGrid) {
          throw new Error("Losing grid not found");
        }
        const rows = await losingGrid.$$(':scope > div');
        const result = [];
  
      for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
        try {
          await row.waitForSelector('span');
          const title = await row.$eval('span', span => span.innerText.trim());

          const imgAndNameDiv = await row.$('div:nth-child(2)');
          if (imgAndNameDiv) {
            const names = await imgAndNameDiv.$$eval('p', ps => ps.map(p => p.innerText.trim()));
            result.push({
              title,
              players: names
            });
          } else {
            console.error(`imgAndNameDiv is null for row ${i + 1}`);
          }

        } catch (error) {
          console.log(result)
          console.error(`Error processing row ${i + 1}:`, error);
        }
      }
  
      console.log(result);
      return result;
    }
    async clickSpecificPlayer(page:Page, num:number) {
      const isArchive = page.url().toLowerCase().includes("archive");
  
      const gridSelector = isArchive
        ? "::-p-xpath(/html/body/app-root/div/div[3]/div[2]/app-archive/div/div/app-game-board/div/div/div[2])"
        : "::-p-xpath(/html/body/app-root/div/div[3]/div[2]/app-game/div/div/app-game-board/div/div/div[2])";
      
        const grid = await page.waitForSelector(gridSelector);
        if (!grid) {
          throw new Error("Grid not found");
        }
        const people = await grid.$$('div');
        // Not sure why this is needed but would only get error in click specific player
        const filteredPeople = people.filter((_, index) => index % 2 === 0);
      
        if (num < 1 || num > filteredPeople.length) {
          console.log(`Invalid player number: ${num}. Must be between 1 and ${filteredPeople.length}.`);
          
        }
        const person = filteredPeople[num - 1];
        console.log(`Clicking person ${num}`);
        await person.click({delay: 1000});
  
  }
  
  async clickFourPlayers(page: Page) {
    const isArchive = page.url().toLowerCase().includes("archive");
  
    const gridSelector = isArchive
      ? "::-p-xpath(/html/body/app-root/div/div[3]/div[2]/app-archive/div/div/app-game-board/div/div/div[2])"
      : "::-p-xpath(/html/body/app-root/div/div[3]/div[2]/app-game/div/div/app-game-board/div/div/div[2])";
  
    console.log(`[clickFourPlayers]: Using selector for ${isArchive ? "archive" : "live"} page`);
  
    const grid = await page.waitForSelector(gridSelector, { timeout: 15000 });
    if (!grid) throw new Error("Grid not found");
  
    const people = await grid.$$(":scope > div");
    console.log(`[clickFourPlayers]: Found ${people.length} people in the grid`);
  
    for (let i = 0; i < Math.min(4, people.length); i++) {
      console.log(`[clickFourPlayers]: Clicking person ${i + 1}`);
      await people[i].click({ delay: 1000 });
    }
  }
  
  async clickSubmit(page:Page) { 
      try {
          await page.waitForSelector('button ::-p-text(Submit)', { timeout: 5000 });
          const testBtmn = await page.$('button ::-p-text(Submit)');
          if (testBtmn) {
              console.log(`[clickSubmit]: Found submit button`);
              await testBtmn.click({delay: 1000});
              return;
          }
      }
      catch (error) {
          console.log('[clickSubmit]: Submit button not found, searching all buttons');
      }
      const submitButton = await page.$$('button');
      console.log(`Found ${submitButton.length} submit buttons`);
      for(let i = 0; i < submitButton.length; i++){
          const button = submitButton[i];
          const buttonText = await button.evaluate(el => el.innerText);
          console.log(`[clickSubmit]: Button ${i + 1} text: ${buttonText}`);
          if (buttonText.includes("Submit")) {
              console.log(`Clicking submit button ${i + 1}`);
              await submitButton[i].click({delay: 1000});
              break;
          }
      }
  }
}

module.exports = LeConnectionsLooker;