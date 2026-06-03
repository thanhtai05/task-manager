import mongoose from "mongoose";
import { z } from "zod";

const objectIdSchema = z
  .string()
  .trim()
  .min(1, { message: "ID is required" })
  .refine((value) => mongoose.Types.ObjectId.isValid(value), {
    message: "Invalid ID",
  });

export const nameSchema = z
  .string()
  .trim()
  .min(1, { message: "Name is required" })
  .max(255);

export const descriptionSchema = z.string().trim().optional();

export const workspaceIdSchema = objectIdSchema;

export { objectIdSchema };

export const changeRoleSchema = z.object({
  roleId: z.string().trim().min(1),
  memberId: z.string().trim().min(1),
});

export const createWorkspaceSchema = z.object({
  name: nameSchema,
  description: descriptionSchema,
});

export const updateWorkspaceSchema = z.object({
  name: nameSchema,
  description: descriptionSchema,
});
