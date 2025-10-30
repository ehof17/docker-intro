import { ElementHandle, Page } from "puppeteer";
import Looker from "./lookerBase";

export default class HoopGridsLooker extends Looker {
    nameMapping: { [key: string]: string } = {};
    protected siteName() { return "hoopgrids"; }
    protected startUrl() { return "https://connections.hoopgrids.com/"; }
    protected archiveUrl(gameId: string) { return `https://connections.hoopgrids.com/archive/${gameId}`; }

    protected async validateLoaded(page: Page, args: { gameId?: string }) {
        // If we requested an archive, ensure we didn't get SPA-redirected to home
        await page.setViewport({ width: 2560, height: 1600 });
        if (args.gameId) {
          const stayedOnArchive = page.url().endsWith(`/archive/${args.gameId}`);
          if (!stayedOnArchive) {
            throw new Error(`Archive ${args.gameId} not released (navigated to ${page.url()})`);
          }
        } else {
          // On the live route, just ensure grid exists
          await this.waitForGrid(page);
          // ads go away
       
        }
      }
      
    constructor() {
        super();
        this.nameMapping = {}
      }

    protected async loseGame(page: Page): Promise<void> {
        await this.closeBeginningModal(page);

    
        // Pre-scrape mapping: the end screen only shows images, so map img->name now
        await this.storeNames(page);
    
        await this.makeTwoSubmissions(page);
        
        // // First guess
        // await this.clickFourPlayers(page);
        // await this.clickSubmit(page);
    
        // // Second guess (swap a couple)
        // await this.clickNewPlayers(page);
        // await this.clickSubmit(page);
    
        // Give up to reveal full solution (site-specific flow)
        console.log('ending game')
        
        await this.endGame(page);
        // small settle time
       
        console.log('waiting  game')
        
        await this.sleep(15000);
        
      }
      async deselectAndReset(page: Page): Promise<void> {
        console.log(`[deselectAndReset]: Attempting to deselect and shuffle`);
    
        const buttonTexts = ["Deselect", "Shuffle"];
        for (const text of buttonTexts) {
            try {
                // First, try finding the button directly by its visible text
                const button = await page.$(`button ::-p-text(${text})`);
                if (button) {
                    console.log(`[deselectAndReset]: Found button with text "${text}"`);
                    await button.click();
                    await this.sleep(500); // small delay to allow UI update
                    continue;
                }
    
                // Fallback — look through all <button> tags for one with matching inner text
                const buttons = await page.$$('button');
                let found = false;
                for (const btn of buttons) {
                    const btnText = (await btn.evaluate(el => el.textContent?.trim() || "")).toLowerCase();
                    if (btnText.includes(text.toLowerCase())) {
                        console.log(`[deselectAndReset]: Found fallback button with text "${text}"`);
                        await btn.evaluate(el => (el as HTMLElement).scrollIntoView({ block: 'center' }));
                        await btn.click({ delay: 300 });
                        found = true;
                        break;
                    }
                }
    
                if (!found) {
                    console.log(`[deselectAndReset]: Could not find button with text "${text}"`);
                    await page.screenshot({ path: `no_${text}_button.png` });
                }
            } catch (err) {
                console.log(`[deselectAndReset]: Error clicking "${text}" button: ${err}`);
            }
        }
    }
    protected async makeTwoSubmissions(page:Page):Promise<void>{
        // click Deselect button
        await this.deselectAndReset(page);
        // Click shuffle button
        await this.clickFourPlayers(page);
        await this.clickSubmit(page);
    
        // Second guess (swap a couple)
        await this.clickNewPlayers(page);
        await this.clickSubmit(page);
    

    }

      private async waitForGrid(page: Page) {
        const gridSelector = ".grid.grid-cols-4.gap-1.md\\:gap-2.w-full";
        const grid = await page.waitForSelector(gridSelector, { timeout: 15000 });
        if (!grid) throw new Error("Grid not found");
        return grid;
      }
    
    // public async getSolutionAtGameId(gameId:string): Promise<solutionResult[]> {
    //     const newUrl = `"https://connections.hoopgrids.com/archive/${gameId}`
    //     const { context, page } = await this.open(newUrl);
    //     try{
    //         await this.closeBeginningModal(page);

    //         // scrape page for player names
    //         // solution only shows player img
    //         await this.storeNames(page);
        
    //         await this.clickFourPlayers(page);
        
    //         await this.clickSubmit(page);
        
    //         await this.clickNewPlayers(page);
        
    //         await this.clickSubmit(page);
        
    //         await this.endGame(page);
    //         await this.sleep(6000);
    //         return await this.scrapeSolution(page);
    //     }
    //     finally{
    //         await this.closeContext(context);
    //     }
    // }

    // public async getSolution(): Promise<solutionResult[]> {
    //     const { context, page } = await this.open();
    //     try{
    //         await this.closeBeginningModal(page);

    //         // scrape page for player names
    //         // solution only shows player img
    //         await this.storeNames(page);
        
    //         await this.clickFourPlayers(page);
        
    //         await this.clickSubmit(page);
        
    //         await this.clickNewPlayers(page);
        
    //         await this.clickSubmit(page);
        
    //         await this.endGame(page);
    //         await this.sleep(6000);
    //         return await this.scrapeSolution(page);
    //     }
    //     finally{
    //         await this.closeContext(context);
    //     }
    // }
    checkTextForButton = async (page:Page, text:string) => {
        // first, check if there is a button with said text
        try{
            const button = await page.$(`button ::-p-text(${text})`);
            return button;
        }
        catch (error) {
            console.log(`[checkTextForButton]: Button with text "${text}" not found`);
            // then try to get all buttons first and check if it matches
            const buttons = await page.$$('button');
            for (const btn of buttons) {
                const buttonText = await btn.evaluate(el => el.innerText);
                if (buttonText.includes(text)) {
                    console.log(`[checkTextForButton]: Found button with text "${text}"`);
                    return btn;
                }
            }
        }
    }

    endGame = async (page:Page) => {
        // click give up button one 
        // then the second one
        console.log(`[endGame]: Ending game by clicking give up button`);
        
        let giveUpButton = await this.checkTextForButton(page, "Give up");    
        // search for give up button
        if (!giveUpButton) {
            console.log('[endGame]: Could not find give up button');
            return;
        }
        console.log(`[endGame]: Found give up button`);
        await page.screenshot({path:"FoundGiveUpButton.png"})
        await giveUpButton.click({ delay: 1000 });
    
        // now find second give up button
       //html/body/app-root/div/div[3]/div[2]/app-game/app-game-board/div/div/div[2]/div[13]
        // bgButton bg-blue-600 class
        let secondGiveUpButton = null;
        // and has inner text of Give ip
        // try to find the second give up button
        console.log(`[endGame]: Attempting to find second give up button`);
        
        try {
            secondGiveUpButton = await page.waitForSelector('button.bg-blue-60 button ::-p-text(Give up)', { timeout: 5000 });
        } catch (error) {
            console.log('[endGame]: Second give up button not found, searching all buttons');
            const buttons = await page.$$('button');
            for (const btn of buttons) {
                const classes = await btn.evaluate(el => el.className);
                const text = await btn.evaluate(el => el.innerText);
                if (classes.includes("bg-blue-600") && text.includes("Give up")) {
                    secondGiveUpButton = btn;
                }
            }
        }
    
        if (!secondGiveUpButton) {
            console.log('[endGame]: Could not find second give up button');
            await page.screenshot({path:"NoFindSecondGiveUp.png"})
            return;
        }
        console.log(`[endGame]: Found second give up button`);
        await page.screenshot({path:"secondGiveupfound.png"})
        await secondGiveUpButton.screenshot({path:'picOfSecondGiveUpButton.png'})
        
        await secondGiveUpButton.click({ delay: 1000 });
    }


    clickNewPlayers = async (page:Page) => {
  
        const selectedPlayersSelector = ".\\!bg-slate-200.border-blue-600";
        const selectedPlayers = await page.$$(selectedPlayersSelector);
        console.log("Found " + selectedPlayers.length + " selected players");
        
        const allPlayersSelector = ".grid.grid-cols-4.gap-1.md\\:gap-2.w-full > div";
        const allPlayers = await page.$$(allPlayersSelector);
    
        if (selectedPlayers.length == 4){
            await this.clickOneAndFive(page);
        }
        else {
            // will this bug out
            await this.clickFourPlayers(page);
        }
    
    }
    async clickOneAndFive(page: Page) {


        const GRID = await this.getGridSelector(page);
        await page.waitForSelector(GRID, { timeout: 30000 });
        await this.safeClickByIndex(page, GRID, ":scope > div", 0);
        await this.sleep(200);
        await this.safeClickByIndex(page, GRID, ":scope > div", 4);
      }

      getGridSelector = async(page:Page) => {

        const isArchive = page.url().toLowerCase().includes("archive");
  
        const gridSelector = isArchive
        ? "::-p-xpath(/html/body/app-root/div/div[3]/div[2]/app-archive/app-game-board/div/div/div[2])"
        : "::-p-xpath(/html/body/app-root/div/div[3]/div[2]/app-game/app-game-board/div/div/div[2])";
    
        return gridSelector;
    }

    clickFourPlayers = async (page:Page) => {
        // the grid /html/body/app-root/div/div[3]/div[2]/app-archive/app-game-board/div/div/div[2]
       
        // individual players right after that
        console.log(`[clickFourPlayers]: Clicking four players`);
        const isArchive = page.url().toLowerCase().includes("archive");
  
        const gridSelector = isArchive
        ? "::-p-xpath(/html/body/app-root/div/div[3]/div[2]/app-archive/app-game-board/div/div/div[2])"
        : "::-p-xpath(/html/body/app-root/div/div[3]/div[2]/app-game/app-game-board/div/div/div[2])";
    
        const grid = await page.waitForSelector(gridSelector);
        if (grid){
            const people = await grid.$$(':scope > div');   
            console.log(`Found ${people.length} people in the grid`);
            // click the first 4 players
            for (let i = 0; i < 4; i++) {
                const person = people[i];
                console.log(`Clicking person ${i + 1}`);
                // take screen shot
                await person.click({ delay: 1000 });
            }
        }
        else{
            throw new Error("[clickFourPlayers] Could not find grid")
        }
        
    
    
    }
    clickSubmit = async (page:Page) => {
        console.log(`[clickSubmit]: Attempting to find and click the submit button`);
        const submitButtonClass=".border-2.border-green-700.bg-green-600.text-white.rounded-xl.text-sm.hover\\:shadow-lg.hover\\:scale-105"
        const submitButton = await page.$(submitButtonClass);
        if (submitButton){
            await submitButton.click({ delay: 1000 });
        }
        else{
            console.log("submit button not found")
        }
       
    
    }
    clickGiveUp = async (page: Page) =>{
        const open = await page.$('button:has-text("Give up"), button ::-p-text(Give up)');
        if (!open) throw new Error("Give up button not found");
        await open.click({ delay: 200 });
      
        // confirm in modal (use correct class and/or text)
        const confirm = await page.waitForSelector(
          'button.bg-blue-600:has-text("Give up"), button ::-p-text(Give up)',
          { timeout: 8000 }
        );
        await confirm!.click({ delay: 200 });
      }
    closeBeginningModal = async (page:Page)=>{
        // first time playing hoopgrids
        // modal pops up explaingnig it so time to clsoe it 
        console.log(`[closeBeginningModal]: Closing beginning modal if it exists`);
        // class is close-button
        const closeButton = await page.$('.close-button');
        if (closeButton) {
            console.log(`[closeBeginningModal]: Found close button, clicking it`);
            await closeButton.click({ delay: 1000 });
         
        } else {
            console.log(`[closeBeginningModal]: Close button not found, no modal to close`);
        }
    }
    getAllPlayers = async (page:Page) => {
        // get all players from the grid
        console.log(`[getAllPlayers]: Getting all players from the grid`);
        const gridSelector = ".grid.grid-cols-4.gap-1.md\\:gap-2.w-full";
        const grid = await page.waitForSelector(gridSelector);
        if (grid){
            const players = await grid.$$(':scope > div');   
            console.log(`Found ${players.length} players in the grid`);
            return players;

        }

    }
    storeNames = async (page:Page) => {
        // since the winning grid on this site is only img
        // gotta have 
        console.log(`[storeNames]: Storing names of players in the grid`);
        const players = await this.getAllPlayers(page);
        const  imgToPlayerNames: { [key: string]: string } = {};
    
        // player has div, this div has p inside
        // get the text of the p element inside the div
    
        // have to map the player name with the img src
        if (!players){
            throw new Error("[storeNames] Error accessing all players")
        }
        for (const player of players) {
            const imgEl = await player.$("img");
            const divEl = await player.$("div");
            const nameEl = divEl ? await divEl.$("p") : null;
            // error handling probably bad 
            if (!imgEl || !nameEl) {
                continue;
            }
            const srcHandle = await imgEl.getProperty("src");
            const imgSrc = String(await srcHandle.jsonValue());
            const name = await nameEl.evaluate((el) => (el as HTMLElement).innerText.trim());
            
            if (imgSrc && name) {
                imgToPlayerNames[imgSrc] = name;
            }
            
        }
        this.nameMapping = imgToPlayerNames;
        
    }

    scrapeSolution = async (page:Page) => {
        console.log(`[scrapePlayers]: Scraping players and their categories`);
        // after we win the game
        // scrape the players and their category
        // wait
        const isArchive  = page.url().toLowerCase().includes("archive");
        const winningGridSelector =   isArchive
        ? "::-p-xpath(/html/body/app-root/div/div[3]/div[2]/app-archive/app-game-board/div/div/div[1])"
        : "::-p-xpath(/html/body/app-root/div/div[3]/div[2]/app-game/app-game-board/div/div/div[1])";

        await this.makeTwoSubmissions(page)
        await this.loseGame(page)
        let winningGrid = await page.waitForSelector(winningGridSelector);
        if (!winningGrid) {

            // try losing again
            await this.makeTwoSubmissions(page)
            await this.loseGame(page)
            winningGrid = await page.waitForSelector(winningGridSelector);
            if (!winningGrid){
                await page.screenshot({path:"winningGridNotFound.png"})
                throw new Error("Winning grid not found again")
            }
            

        }
        
        // for each row in winning grid
        const rows = await winningGrid.$$(':scope > div');
        console.log(`[scrapePlayers]: Found ${rows.length} rows in winning grid`);
        const data = []
    
        // wait for silution to be revealed
        await page.screenshot({path:'scrapeSolution.png'})
        for (const row of rows) {
            const title = await row.evaluate((node) => {
                // primary: the centered header line
                const primary = node.querySelector('div.flex.items-center span.font-bold');
                if (primary?.textContent?.trim()) return primary.textContent.trim();
            
                // fallback A: any bold span under that header (class shape may change slightly)
                const alt = node.querySelector('div.flex.items-center span');
                if (alt?.textContent?.trim()) return alt.textContent.trim();
            
                // fallback B: the element immediately preceding the grid (some builds render title there)
                const grid = node.querySelector('div.grid.grid-cols-4');
                const maybeHeader = grid?.previousElementSibling?.querySelector('span');
                if (maybeHeader?.textContent?.trim()) return maybeHeader.textContent.trim();
            
                // fallback C: any bold span in the card (last resort)
                const loose = node.querySelector('span.font-bold');
                if (loose?.textContent?.trim()) return loose.textContent.trim();
            
                return ''; 
              });
        
            // Get all img tags within the grid container
            const imgElements = await row.$$('div.grid.grid-cols-4 img');
            const playerImages = [];
            for (const img of imgElements) {
                const src = await page.evaluate(el => el.src, img);
                const playerName = this.nameMapping[src] || src;
                playerImages.push(playerName);
            }
        
            data.push({
                title,
                players: playerImages
            });
            
        }
        return data;
    }


    

}
module.exports = HoopGridsLooker