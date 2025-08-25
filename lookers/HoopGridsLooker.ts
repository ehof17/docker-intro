import { ElementHandle, Page } from "puppeteer";
import Looker from "./lookerBase";
import { solutionResult } from "../utils/types";
import { error } from "console";

export default class HoopGridsLooker extends Looker {
    nameMapping: { [key: string]: string } = {};
    constructor() {
        super();
        this.nameMapping = {}
      }
      protected getStartUrl(): string {
        return "https://connections.hoopgrids.com/";
    }
    public async getSolution(): Promise<solutionResult[]> {
        const { context, page } = await this.open();
        try{
            await this.closeBeginningModal(page);

            // scrape page for player names
            // solution only shows player img
            await this.storeNames(page);
        
            await this.clickFourPlayers(page);
        
            await this.clickSubmit(page);
        
            await this.clickNewPlayers(page);
        
            await this.clickSubmit(page);
        
            await this.endGame(page);
            await this.sleep(6000);
            return await this.scrapePlayers(page);
        }
        finally{
            await this.closeContext(context);
        }
    }
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
        await giveUpButton.click({ delay: 1000 });
    
        // now find second give up button
     
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
            return;
        }
        console.log(`[endGame]: Found second give up button`);
        
        await secondGiveUpButton.click({ delay: 1000 });
    }


    clickNewPlayers = async (page:Page) => {
  
        const selectedPlayersSelector = ".\\!bg-slate-200.border-blue-600";
        const selectedPlayers = await page.$$(selectedPlayersSelector);
        console.log("Found " + selectedPlayers.length + " selected players");
        const allPlayersSelector = ".grid.grid-cols-4.gap-1.md\\:gap-2.w-full > div";
        const allPlayers = await page.$$(allPlayersSelector);
    
        if (selectedPlayers.length == 4){
            await this.clickOneAndFive(allPlayers);
        }
        else {
            // will this bug out
            await this.clickFourPlayers(page);
        }
    
    }
    clickOneAndFive = async (players:ElementHandle<HTMLDivElement>[]) => {
        // click the first and fifth
        console.log(`[clickOneAndFive]: Clicking first and fifth players`);
        const firstPlayer = players[0];
        const fifthPlayer = players[4];
        await firstPlayer.click({ delay: 1000 });
        await fifthPlayer.click({ delay: 1000 });
    
    }

    clickFourPlayers = async (page:Page) => {
        // the grid /html/body/app-root/div/div[3]/div[2]/app-archive/app-game-board/div/div/div[2]
        
        // individual players right after that
        console.log(`[clickFourPlayers]: Clicking four players`);
    
    
        const gridSelector = ".grid.grid-cols-4.gap-1.md\\:gap-2.w-full";
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
        // store the names of the players in the grid
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

    scrapePlayers = async (page:Page) => {
        console.log(`[scrapePlayers]: Scraping players and their categories`);
        // after we win the game
        // scrape the players and their category
        // wait
    
        const winningGridSelector = ".mb-2.mt-2.md\\:mt-0";
        const winningGrid = await page.waitForSelector(winningGridSelector);
        if (!winningGrid) {
            throw new Error("Winning grid not found");
        }
        // for each row in winning grid
        const rows = await winningGrid.$$(':scope > div');
        console.log(`[scrapePlayers]: Found ${rows.length} rows in winning grid`);
        const data = []
    
        // wait for silution to be revealed
        for (const row of rows) {
            const categorySpan = await row.$('div.flex.items-center span');
            if (!categorySpan){
                throw new Error("[scrapePlayers]: Couldn't find category span")
            }
            const title = await categorySpan.evaluate(el => (el.textContent?.trim() ?? ""));
        
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