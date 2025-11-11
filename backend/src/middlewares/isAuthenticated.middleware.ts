import { NextFunction, Request, Response } from "express";
import { UnauthorizedException } from "../utils/appError";
import UserModel from "../models/user.model";

const isAuthenticated = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?._id;

  // No session user -> unauthorized
  if (!userId) {
    return next(new UnauthorizedException("Unauthorized. Please log in."));
  }

  // Validate that the user still exists (handles stale sessions after DB resets)
  try {
    const exists = await UserModel.exists({ _id: userId });
    if (!exists) {
      // Clear stale session and signal unauthorized
      try {
        req.logout(() => {});
      } catch {}
      req.session = null;
      return next(new UnauthorizedException("Session expired. Please log in."));
    }
  } catch (err) {
    // If validation fails due to DB error, treat as unauthorized
    return next(new UnauthorizedException("Unauthorized. Please log in."));
  }

  return next();
};

export default isAuthenticated;
