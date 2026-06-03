import UserModel from "../models/user.model";
import { BadRequestException } from "../utils/appError";

export const getCurrentUserService = async (userId: string) => {
  const user = await UserModel.findById(userId)
    .populate("currentWorkspace")
    .select("-password");

  if (!user) {
    throw new BadRequestException("User not found");
  }

  const safeUser = user.toObject();
  delete (safeUser as any).passwordResetToken;
  delete (safeUser as any).passwordResetExpires;

  return {
    user: safeUser,
  };
};
