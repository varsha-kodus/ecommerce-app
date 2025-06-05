import express from "express";
import dotenv from "dotenv";
import authRoute from "./routes/authRoutes";
import commonRoute from "./routes/route";
import { ErrorRequestHandler } from "express";
import multer from "multer";
dotenv.config();

const app = express();

// Body parsers (for JSON and urlencoded)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Use routes
app.use(authRoute);
app.use(commonRoute);

const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({ error: "File size exceeds 2MB" });
      return;
    }
    res.status(400).json({ error: err.message });
    return;
  }

  if (err.code === "INVALID_FILE_TYPE") {
    res.status(400).json({ error: err.message });
    return;
  }

  res.status(500).json({ error: err.message || "Internal Server Error" });
};

app.use(errorHandler);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
