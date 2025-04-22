const puppeteer = require("puppeteer");
const express = require("express");


const app = express();
app.use(express.json());

let browserPromise = puppeteer.launch({
  headless: "chrome",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});


let cachedSolution = null;
let cachedDate = null;


function isToday(date) {
  const now = new Date();
  return (
    date &&
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}


app.get("/get-connectionLinks", async (req, res) => {
    if (cachedSolution && isToday(cachedDate)) {
        console.log("Serving cached solution for today");
        return res.send(cachedSolution);
      }
    // starting browser in endpoint would use a ton of memmory
    const browser = await browserPromise;
    const page = await browser.newPage();
    await page.goto('https://www.leconnections.app/', {
        waitUntil: "networkidle2",
    });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3 WAIT_UNTIL=load');

  
    await page.reload({ waitUntil: ["networkidle2"] });
    // 1. lose game on purpose
    await loseGame(page);
    // 2. solution is revealed, scrape it
    const sol = await getSolution(page);

    // cache it so we dont spin up a new browser every time
    cachedSolution = sol;
    cachedDate = new Date();
  
    await browser.close();
    res.send(sol);
});

async function loseGame(page){
    const appToastSelector = 'app-toast';

    console.log(`[loseGame] Clicking Four Players`);
    await clickFourPlayers(page);
    console.log(`[loseGame] Clicking Submit`);
    await clickSubmit(page)
    console.log(`[loseGame] Waiting for 10 seconds before retrying`);
    await sleep(10000); 
    console.log(`[loseGame] Retrying 3 times`);

    // After clicking 4 players and submitting, we could have got a valid connection
    // So to determine what happend we try submitting again
    // Got it right - nobody would be selected anymore
    // Got it wrong - we get a toast message saying we already guessed this combination
    for (let i = 0; i < 3; i++) {
        console.log(`[loseGame] Attempt ${i + 1}`);
        await clickSubmit(page)
        console.log(`[loseGame] Clicked Submit`);
        console.log(`[loseGame] Trying to check toast message`);
        try{
            await page.waitForSelector(appToastSelector);
            const appToast = await page.$(appToastSelector);
            const toastText = await appToast.evaluate(el => el.innerText);
            console.log(`[Toast] ${toastText}`);

            if (toastText.includes("You need to select 4 players")) {
                await clickFourPlayers(page);
                await clickSubmit(page);
            }
            else {
                await clickSpecificPlayer(page, i+1); // deselect first player
                await clickSpecificPlayer(page, i+5); // select a new player
                await clickSubmit(page);
                
            }
            await sleep(5000);
        }
        catch (error) {
            console.log(`[loseGame] No toast message found, continuing...`);
            await clickSpecificPlayer(page, i+1); // deselect first player
            await clickSpecificPlayer(page, i+5); // select a new player
            await clickSubmit(page);
        }
       
      
}}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

const getSolution = async (page) => {
    const losinggrid = "::-p-xpath(/html/body/app-root/div/div[3]/div[2]/app-game/div/div/app-game-board/div/div/div[1])"
    await page.waitForSelector(losinggrid);
    const losingGrid = await page.$(losinggrid);
    // scope will grab only the first divs
    // $$ (div) would return 34, scope 16
    const rows = await losingGrid.$$(':scope > div');
    const result = [];

    for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
        await row.waitForSelector('span');
        const title = await row.$eval('span', span => span.innerText.trim());

        const imgAndNameDiv = await row.$('div:nth-child(2)');
        const names = await imgAndNameDiv.$$eval('p', ps => ps.map(p => p.innerText.trim()));

        result.push({
            title,
            players: names
        });

    } catch (error) {
        console.error(`Error processing row ${i + 1}:`, error);
    }
    }

    console.log(result);
    return result;
}
  


const clickSpecificPlayer = async (page, num) => {
    const gridSelector = "::-p-xpath(/html/body/app-root/div/div[3]/div[2]/app-game/div/div/app-game-board/div/div/div[2])"
    const grid = await page.waitForSelector(gridSelector);
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

const clickFourPlayers = async (page) => {  
    const gridSelector = "::-p-xpath(/html/body/app-root/div/div[3]/div[2]/app-game/div/div/app-game-board/div/div/div[2])"
    const grid = await page.waitForSelector(gridSelector);
    const people = await grid.$$(':scope > div');
    console.log(`Found ${people.length} people in the grid`);

    for(let i = 0; i < 4; i++){
        const person = people[i];

        console.log(`Clicking person ${i + 1}`);
        await person.click({delay: 1000});
    }

}

const clickSubmit = async (page) => { 

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


app.get('/', (req, res) => {
    console.log('Received a request.');
    res.send("Hello Cloud Run!");
  });
  
const port = process.env.PORT || 8080;

app.listen(port, () => {
  console.log('Listening on port', port);
});