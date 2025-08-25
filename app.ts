import express, { type Request, type Response } from 'express';

import lookerRouter from "./routes/looker"
const app = express();
const port = 8080;

app.use(express.json());
app.use('/api', lookerRouter)

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

