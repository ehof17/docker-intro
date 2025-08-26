import express from "express";
import GrabberService from "../services/grabbers";
import StorageService from "../services/storage";
import { ValidLookerString, solutionResult, validLookerStrings } from "../utils/types";

const lookerRouter = express.Router();
const grabbersService = new GrabberService();
const storageService = new StorageService()

lookerRouter.get("/looker/:site", async (req, res) => {
  try {
    const sitename = req.params.site;
    const result = await grabbersService.getByName(sitename);
    res.set('Cache-Control', 'public, max-age=300');
    if (!result) {
      res.status(404).json({ message: "Not found" });
      return;
    }
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

lookerRouter.get("/lookerjob/daily", async (req, res) => {
  try {
    const resultMap = await runLookers(["leconnections", "hoopgrids"]);
    res.json(resultMap);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Daily scrape failed" });
  }
});

lookerRouter.get("/lookerjob/weekly", async (req, res) => {
  try {
    const resultMap = await runLookers(["leconnectionshof"]);
    res.json(resultMap);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Weekly scrape failed" });
  }
});

async function runLookers(
  siteNames: readonly ValidLookerString[]
): Promise<Record<ValidLookerString, solutionResult[]>> {
  // run lookers on all sites
  const resultMap = Object.fromEntries(
    await Promise.all(
      siteNames.map(async (name) => {
        const rows = await grabbersService.getByName(name);
        return [name, rows] as const;
      })
    )
  ) as Record<ValidLookerString, solutionResult[]>;

  const allResults = Object.values(resultMap).flat();
  // save results to neon
  await Promise.all(allResults.map((res) => storageService.saveConnection(res)));
  return resultMap;
}


export default lookerRouter;