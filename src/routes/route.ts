import express from "express";
import validateToken from "../middleware/validateTokenHandler";
import { createShop, updateShop } from "../controllers/shopController";

const router = express.Router();

router.post("/api/shops", validateToken ,createShop);
router.patch("/api/shops/:id", validateToken, updateShop);

export default router;