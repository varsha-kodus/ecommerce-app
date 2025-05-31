import express from "express";
import dotenv from 'dotenv';
import { testConnection } from "./config/dbConnection";
import authRoutes from "./routes/authRoutes";

const app = express();

// Load environment variables
dotenv.config();
app.use(express.json());
testConnection(); // database connection

app.use("/api",authRoutes);

const port = process.env.PORT || 3000;
app.listen(port,()=>{
    console.log(`Server running on port ${port}`);
});