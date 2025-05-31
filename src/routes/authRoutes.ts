import express from "express";
import { registerUser, loginUser } from "../controllers/authController";
import { initTables } from "../db/initTables";

const router = express.Router();

router.get("/db-table", initTables);
router.post("/auth/register", registerUser);
router.post("/auth/login", loginUser); 


export default router;
