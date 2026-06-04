import { PermissionType, Permissions } from "../enums/role.enum";
import { UnauthorizedException } from "./appError";
import { RolePermissions } from "./role-permission";

export const roleGuard = (
  role: string | undefined,
  requiredPermissions: PermissionType[]
) => {
  const normalizedRole = typeof role === "string" ? role.trim() : "";

  if (
    !normalizedRole ||
    !Object.prototype.hasOwnProperty.call(RolePermissions, normalizedRole)
  ) {
    throw new UnauthorizedException(
      "You do not have the necessary permissions to perform this action"
    );
  }

  const permissions = RolePermissions[
    normalizedRole as keyof typeof RolePermissions
  ];

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
