import { PermissionType, Permissions } from "../enums/role.enum";
import { UnauthorizedException } from "./appError";
import { RolePermissions } from "./role-permission";

export const roleGuard = (
  role: keyof typeof RolePermissions | undefined,
  requiredPermissions: PermissionType[]
) => {
  if (!role || !Object.prototype.hasOwnProperty.call(RolePermissions, role)) {
    throw new UnauthorizedException(
      "You do not have the necessary permissions to perform this action"
    );
  }

  const permissions = RolePermissions[role];
  if (!permissions || !Array.isArray(permissions)) {
    throw new UnauthorizedException(
      "You do not have the necessary permissions to perform this action"
    );
  }

  const hasPermission = requiredPermissions.every((permission) =>
    permissions.includes(permission)
  );

  if (!hasPermission) {
    throw new UnauthorizedException(
      "You do not have the necessary permissions to perform this action"
    );
  }
};
