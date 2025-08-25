import express from "express";
import GrabberService from "../services/grabbers";

const lookerRouter = express.Router();
const grabbersService = new GrabberService();

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

export default lookerRouter;