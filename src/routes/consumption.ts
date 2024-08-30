import { Router } from "express";
import {
  getListByCustomer,
  patchValueConfirm,
  uploadValue,
} from "../controllers/Consumption/ConsumptionController";

const router = Router();

router.get("/:customerCode/list", getListByCustomer);
router.patch("/confirm", patchValueConfirm);
router.post("/upload", uploadValue);

export default router;
