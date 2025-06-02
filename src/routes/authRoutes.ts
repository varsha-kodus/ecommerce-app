import express from "express";
import { registerUser, loginUser, currentUser, refreshAccessToken, logout } from "../controllers/authController";
import { initTables } from "../db/initTables";
import validateToken from "../middleware/validateTokenHandler";

const router = express.Router();

router.get("/api/db-table", initTables);
router.post("/api/auth/register", registerUser);
router.post("/api/auth/login", loginUser); 
router.get("/api/auth/me", validateToken, currentUser); 
router.post("/api/auth/refresh", refreshAccessToken); 
router.post("/api/auth/logout", validateToken , logout); 

export default router;
