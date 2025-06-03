import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

interface AuthenticatedRequest extends Request {
    user: {
        id: string;
        name: string;
        email: string;
        role: string;
        status: string;
        profile_image: string
    };
}

const validateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeaderRaw = req.headers.authorization || req.headers.Authorization;
    
    const authHeader = Array.isArray(authHeaderRaw) ? authHeaderRaw[0] : authHeaderRaw;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ message: "Authorization token is missing or malformed" });
      return;
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      res.status(401).json({ message: "User is not authorized or token missing" });
      return;
    }

    const decoded = await new Promise<any>((resolve, reject) => {
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET as string, (err, decoded) => {
        if (err) return reject(err);
        resolve(decoded);
      });
    });

    if (typeof decoded === "object" && decoded !== null && "user" in decoded) {        
      (req as AuthenticatedRequest).user = decoded.user;
      next();
    } else {
      res.status(401).json({ message: "Invalid token payload" });
    }
  } catch (err) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

export default validateToken;