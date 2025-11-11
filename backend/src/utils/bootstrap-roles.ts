import RoleModel from "../models/roles-permission.model";
import { RolePermissions } from "./role-permission";

export const bootstrapRoles = async (): Promise<void> => {
  for (const roleName in RolePermissions) {
    const existing = await RoleModel.findOne({ name: roleName });
    if (!existing) {
      const permissions = RolePermissions[roleName as keyof typeof RolePermissions];
      const newRole = new RoleModel({ name: roleName, permissions });
      await newRole.save();
      console.log(`[bootstrap] Role ${roleName} created`);
    }
  }
  console.log("[bootstrap] Default roles ensured");
};