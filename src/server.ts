import express from "express";
import dotenv from "dotenv";
import authRoute from "./routes/authRoutes";
import commonRoute from "./routes/route";

dotenv.config();

const app = express();

// Body parsers (for JSON and urlencoded)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Use routes
app.use(authRoute);
app.use(commonRoute);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
