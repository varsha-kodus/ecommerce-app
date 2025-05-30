import express from "express";
import dotenv from 'dotenv';
import testConnection from "./config/dbConnection";

const app = express();

// Load environment variables
dotenv.config();
testConnection();

app.get('/about',(req,res)=>{
        res.send('Hello !! Abous Us');
})

const port = process.env.PORT || 3000;
app.listen(port,()=>{
    console.log(`Server running on port ${port}`);
});