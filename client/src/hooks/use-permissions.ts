import { PermissionType } from "@/constant";
import { UserType, WorkspaceWithMembersType } from "@/types/api.type";
import { useEffect, useMemo, useState } from "react";

const usePermissions = (
  user: UserType | undefined,
  workspace: WorkspaceWithMembersType | undefined
) => {
  const [permissions, setPermissions] = useState<PermissionType[]>([]);

  useEffect(() => {
    if (user && workspace) {
      const member = workspace.members.find((member) => {
        const memberUserId =
          typeof member.userId === "string"
            ? member.userId
            : member.userId?._id || String(member.userId);
        return memberUserId === user._id;
      });

      setPermissions(member?.role?.permissions ?? []);
    } else {
      setPermissions([]);
    }
  }, [user, workspace]);

  return useMemo(() => permissions, [permissions]);
};

export default usePermissions;
