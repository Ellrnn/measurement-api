import express from "express";

import * as v from "valibot";
import "@valibot/i18n/pt";

import consumptionRouter from "./routes/consumption";

const app = express();

v.setGlobalConfig({ lang: "pt" });

app.use("/public", express.static("public"));
app.use(express.json({ limit: "50mb" }));
app.use("/", consumptionRouter);

app.listen(4000, () => {
  console.log("Servidor Iniciado!");
});
