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

// hit all sites, save them to neon
lookerRouter.get("/lookerjob/daily", async (req, res) => {
  try {
    const results: Record<ValidLookerString, solutionResult[]> = {} as any;

    // looker on all sites
    const resultMap = Object.fromEntries(
      await Promise.all(
        validLookerStrings.map(async (name) => {
          const rows = await grabbersService.getByName(name);
          return [name, rows] as const;
        })
      )
    );

    const allResults = Object.values(resultMap).flat();

    // save to DB
    await Promise.all(allResults.map((res) => storageService.saveConnection(res)));

    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Daily scrape failed" });
  }
});

export default lookerRouter;