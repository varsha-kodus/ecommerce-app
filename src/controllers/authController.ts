import { Request, Response } from "express";
import authService from "../services/authService";
import { body, validationResult } from "express-validator";
import { pool } from '../config/dbConnection'; 
import { AuthenticatedRequest } from "../types/auth";

// Helper to get one error per field
const getFieldErrors = (req: Request): Record<string, string> => {
  const result = validationResult(req);
  const mapped = result.mapped();
  const errors: Record<string, string> = {};
  for (const field in mapped) {
    errors[field] = mapped[field].msg;
  }
  return errors;
};

export const registerUser = async (req: Request, res: Response) => {
    await body("name")
        .notEmpty().withMessage("Name is required")
        .isLength({ min: 3, max: 30 }).withMessage("Name must be between 3 and 30 characters")
        .run(req);
    await body("email")
        .notEmpty().withMessage("Email is required")
        .isEmail().withMessage("Enter a valid email")
        .custom(async (value) => {
            const query = "SELECT 1 FROM users WHERE email = $1 LIMIT 1";
            const result = await pool.query(query, [value]);
            if (result.rowCount !== null && result.rowCount > 0) {
            throw new Error("User with this email already exists!");
            }
            return true;
        })
        .run(req);
    await body("password")
        .notEmpty().withMessage("Password is required")
        .isLength({ min: 6 }).withMessage("Password must be at least 6 characters")
        .run(req);
    await body("phone")
        .optional()
        .isLength({ min: 10, max: 20 }).withMessage("Phone number must be between 10 and 20 characters")
        .run(req);
    await body("role")
        .optional()
        .isIn(['user', 'admin']).withMessage("Role must be either 'user' or 'admin'")
        .run(req);

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: getFieldErrors(req) });
    return;
  }

  const { name, email, password, role } = req.body;

  try {
    const user = await authService.register({ name, email, password, role });
    res.status(201).json({ message: "User registered successfully", user: user });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const loginUser = async (req: Request, res: Response) => {
    await body("email")
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Invalid email")
    .run(req);
    await body("password")
        .notEmpty().withMessage("Password is required")
        .run(req);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: getFieldErrors(req) });
        return;
    }

    const {email, password} = req.body;

    try{
        const { accessToken, refreshToken, user } = await authService.login({ email, password });
        res.status(200).json({ success: true, message:"Login successful", accessToken, refreshToken, user })
    }catch(error: any){
        res.status(401).json({ success: false, message: error.message });
    }

};

export const currentUser = async (req: Request, res: Response) : Promise<void> => {
     const authUser = req as AuthenticatedRequest;

    try {
        const userData = await authService.currentUser(authUser.user.id);

        if (!userData) {
           res.status(404).json({ error: 'User data not found' });
        }

        res.status(200).json(userData);
    } catch (error: any) {
        res.status(500).json({ success:false, message: error.message });
    }
}

export const refreshAccessToken = async (req: Request, res: Response) : Promise<void> => {
  await body("refreshToken")
    .notEmpty()
    .withMessage("Refresh token is required")
    .run(req);

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: getFieldErrors(req) });
  }

  const { refreshToken } = req.body;

  try {
    const { newAccessToken, newRefreshToken } = await authService.refreshAccessToken(refreshToken);

    res.status(200).json({ 
      accessToken: newAccessToken, 
      refreshToken: newRefreshToken 
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const logout = async (req: Request, res: Response) : Promise<void> => {
    const refreshToken = req.body?.refreshToken ?? null;

      const authUser = req as AuthenticatedRequest;

    try {
      await authService.logout(refreshToken, authUser.user.id);

      res.status(200).json({ message: "Logged out successfully" });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
}