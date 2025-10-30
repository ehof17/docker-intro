#!/usr/bin/env ts-node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import GrabberService from "./services/grabbers";
import StorageService from "./services/storage";
import {
  ValidLookerString,
  solutionResult,
  validLookerStrings,
} from "./utils/types";
import { calculateGameDate } from "./utils/helpers";


function isValidName(x: string): x is ValidLookerString {
  return (validLookerStrings as readonly string[]).includes(x);
}

const DAILY: readonly ValidLookerString[] = ["leconnections", "hoopgrids"];
const WEEKLY: readonly ValidLookerString[] = ["leconnectionshof"];

// --- CLI parse ---
(async () => {
    const argv = await yargs(hideBin(process.argv))
    .option("name", {
        type: "array",
        string: true,
        describe:
        "One or more site names (e.g., leconnections hoopgrids). Mutually exclusive with --mode.",
    })
    .option("mode", {
        type: "string",
        choices: ["daily", "weekly"] as const,
        describe: "Shortcut to run predefined sets (daily or weekly).",
    })
    .option("id", {
        type: "string",
        describe: "Optional game ID for archive scraping (if supported).",
    })
    .option("dry-run", {
        type: "boolean",
        default: false,
        describe: "Run without saving results to storage.",
    })
    .conflicts("name", "mode")
    .strict(false)
    .help()
    .parse();

    let siteNames: readonly ValidLookerString[];

    if (argv.mode) {
    siteNames = argv.mode === "daily" ? DAILY : WEEKLY;
    } else if (argv.name && argv.name.length > 0) {
  
    const bad = argv.name.filter((n) => !isValidName(String(n)));
    if (bad.length) {
        console.error(
        `Invalid name(s): ${bad.join(
            ", "
        )}. Valid options: ${validLookerStrings.join(", ")}`
        );
        process.exit(1);
    }
    siteNames = argv.name as ValidLookerString[];
    } else {
    console.error( "Provide --mode daily|weekly or --name <one or more valid names>."
    );
    process.exit(1);
    }

    const grabbersService = new GrabberService();
    const storageService = new StorageService();

    async function runLookers(
    names: readonly ValidLookerString[],
    gameId?: string
    ): Promise<Record<ValidLookerString, solutionResult[]>> {
    const resultEntries = await Promise.all(
        names.map(async (name) => {
        const rows = gameId
            ? await grabbersService.getByName(name, gameId)
            : await grabbersService.getByName(name);

        return [name, rows ?? []] as const;
        })
    );

    const resultMap = Object.fromEntries(resultEntries) as Record<
        ValidLookerString,
        solutionResult[]
    >;

    if (!argv["dry-run"]) {

        const gameId = argv.id ?? "";
        const gameIdInt =parseInt(gameId, 10);
    
        const savePromises: Promise<unknown>[] = [];
    
        for (const [siteName, rows] of Object.entries(resultMap) as [
        ValidLookerString,
        solutionResult[]
        ][]) {
        console.log('saving results')
        const gameDate = calculateGameDate(siteName, gameIdInt);
    
        for (const r of rows) {
            savePromises.push(
            storageService.saveLooked(
                r,               
                gameId,            // gameId: string
                siteName,          // siteName: string (ValidLookerString)
                gameDate           // gameDate: Date
            )
            );
        }
        }
    
        await Promise.all(savePromises);
        console.log('saved results')
    }
  

    return resultMap;
    }

    (async () => {
    try {
        const result = await runLookers(siteNames, argv.id);
        // print JSON to stdout so this can be piped/cron’d
        console.log(JSON.stringify(result, null, 2));
        process.exit(0);
    } catch (err) {
        console.error("❌ Error:", err);
        process.exit(1);
    }
    })();
})();