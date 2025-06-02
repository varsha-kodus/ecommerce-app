import { Request } from "express";

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
    profile_image: string
  };
}
