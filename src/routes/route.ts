import express from "express";
import validateToken from "../middleware/validateTokenHandler";
import { createShop, updateShop, getShop, getShops, updateShopStatus } from "../controllers/shopController";
import { createCategory, updateCategory, getCategory, getCategories, updateCategoryStatus } from "../controllers/categoryController";

const router = express.Router();

//shop
router.post("/api/shops", validateToken ,createShop);
router.patch("/api/shops/:id", validateToken, updateShop);
router.get("/api/shops/:id", getShop);
router.get("/api/shops", getShops);
router.patch("/api/shops/:id/status", updateShopStatus);

//category
router.post("/api/categories", validateToken ,createCategory);
router.patch("/api/categories/:id", validateToken ,updateCategory);
router.get("/api/categories/:id" ,getCategory);
router.get("/api/categories" ,getCategories);
router.patch("/api/categories/:id/status", validateToken, updateCategoryStatus);

export default router;