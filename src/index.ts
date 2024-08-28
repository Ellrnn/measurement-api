import express, { Request, Response } from "express";

import consumptionRouter from "./routes/consumption";

const app = express();

app.use("/", consumptionRouter);

app.listen(3000, () => {
  console.log("Servidor iniciadao!");
});
