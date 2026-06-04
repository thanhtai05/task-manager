import mongoose from "mongoose";

import UserModel from "../models/user.model";
import AccountModel from "../models/account.model";
import WorkspaceModel from "../models/workspace.model";
import RoleModel from "../models/roles-permission.model";
import MemberModel from "../models/member.model";
import ProjectModel, { ProjectDocument } from "../models/project.model";
import TaskModel from "../models/task.model";

import { Roles, RoleType } from "../enums/role.enum";
import { TaskPriorityEnum, TaskStatusEnum } from "../enums/task.enum";
import { ProviderEnum } from "../enums/account-provider.enum";

import { RolePermissions } from "../utils/role-permission";

const randomOf = <T>(arr: readonly T[]): T =>
  arr[Math.floor(Math.random() * arr.length)];

const titles = [
  "Design wireframes",
  "Implement auth",
  "Fix navbar",
  "Write unit tests",
  "Optimize query",
  "Update docs",
  "Refactor components",
  "Setup CI",
  "Add pagination",
  "Improve UX",
];

const descriptions = [
  "Small tweak",
  "Important change",
  "Blocking bug",
  "Performance improvement",
  "Feature enhancement",
];

export const seedDemoData = async (
  count = Number(process.env.SEED_DEMO_COUNT) || 100
): Promise<void> => {
  try {
    console.log("[seed-demo] Starting...");

    // =====================
    // Ensure Roles
    // =====================

    const ensureRole = async (roleName: RoleType) => {
      let role = await RoleModel.findOne({ name: roleName });

      if (!role) {
        role = await RoleModel.create({
          name: roleName,
          permissions: RolePermissions[roleName],
        });

        console.log(`[seed-demo] Role ${roleName} created`);
      }

      return role;
    };

    const ownerRole = await ensureRole(Roles.OWNER);
    const adminRole = await ensureRole(Roles.ADMIN);
    const memberRole = await ensureRole(Roles.MEMBER);

    // =====================
    // Owner User
    // =====================

    let ownerUser = await UserModel.findOne({
      email: "owner@example.com",
    });

    if (!ownerUser) {
      ownerUser = await UserModel.create({
        name: "Owner User",
        email: "owner@example.com",
        password: "Passw0rd!",
      });

      await AccountModel.create({
        userId: ownerUser._id,
        provider: ProviderEnum.EMAIL,
        providerId: ownerUser.email,
      });

      console.log("[seed-demo] Owner created");
    }

    // =====================
    // Admin User
    // =====================

    let adminUser = await UserModel.findOne({
      email: "admin@example.com",
    });

    if (!adminUser) {
      adminUser = await UserModel.create({
        name: "Admin User",
        email: "admin@example.com",
        password: "Passw0rd!",
      });

      await AccountModel.create({
        userId: adminUser._id,
        provider: ProviderEnum.EMAIL,
        providerId: adminUser.email,
      });

      console.log("[seed-demo] Admin created");
    }

    // =====================
    // Member User
    // =====================

    let memberUser = await UserModel.findOne({
      email: "member@example.com",
    });

    if (!memberUser) {
      memberUser = await UserModel.create({
        name: "Member User",
        email: "member@example.com",
        password: "Passw0rd!",
      });

      await AccountModel.create({
        userId: memberUser._id,
        provider: ProviderEnum.EMAIL,
        providerId: memberUser.email,
      });

      console.log("[seed-demo] Member created");
    }

    if (!ownerUser || !adminUser || !memberUser) {
      throw new Error("Demo users not found");
    }

    // =====================
    // Workspace
    // =====================

    let workspace = await WorkspaceModel.findOne({
      name: "Demo Workspace",
    });

    if (!workspace) {
      workspace = await WorkspaceModel.create({
        name: "Demo Workspace",
        description: "Workspace for testing",
        owner: ownerUser._id,
      });

      console.log("[seed-demo] Workspace created");
    }

    // =====================
    // Current Workspace
    // =====================

    ownerUser.currentWorkspace = workspace._id as mongoose.Types.ObjectId;
    adminUser.currentWorkspace = workspace._id as mongoose.Types.ObjectId;
    memberUser.currentWorkspace = workspace._id as mongoose.Types.ObjectId;

    await ownerUser.save();
    await adminUser.save();
    await memberUser.save();

    // =====================
    // Members
    // =====================

    const ensureMember = async (
      userId: mongoose.Types.ObjectId,
      roleId: mongoose.Types.ObjectId
    ) => {
      const existing = await MemberModel.findOne({
        userId,
        workspaceId: workspace._id,
      });

      if (!existing) {
        await MemberModel.create({
          userId,
          workspaceId: workspace._id,
          role: roleId,
        });
      }
    };

    await ensureMember(
      ownerUser._id as mongoose.Types.ObjectId,
      ownerRole._id as mongoose.Types.ObjectId
    );

    await ensureMember(
      adminUser._id as mongoose.Types.ObjectId,
      adminRole._id as mongoose.Types.ObjectId
    );

    await ensureMember(
      memberUser._id as mongoose.Types.ObjectId,
      memberRole._id as mongoose.Types.ObjectId
    );

    // =====================
    // Projects
    // =====================

    const projectNames = [
      "Project Alpha",
      "Project Beta",
      "Project Gamma",
      "Project Delta",
    ];

  const projects: ProjectDocument[] = [];

    for (const name of projectNames) {
      let project = await ProjectModel.findOne({
        name,
        workspace: workspace._id,
      });

      if (!project) {
        project = await ProjectModel.create({
          name,
          description: `${name} description`,
          workspace: workspace._id,
          createdBy: ownerUser._id,
        });

        console.log(`[seed-demo] ${name} created`);
      }

      projects.push(project);
    }

    // =====================
    // Tasks
    // =====================

    const statuses = Object.values(TaskStatusEnum);
    const priorities = Object.values(TaskPriorityEnum);

    const users = [ownerUser, adminUser, memberUser];

    const tasks = Array.from({ length: count }, () => {
      const project = randomOf(projects);
      const assignedUser = randomOf(users);

      const dueDate =
        Math.random() > 0.3
          ? new Date(
              Date.now() +
                Math.floor(Math.random() * 60) *
                  24 *
                  60 *
                  60 *
                  1000
            )
          : null;

      return {
        title: randomOf(titles),
        description: randomOf(descriptions),

        project: project._id,
        workspace: workspace._id,

        status: randomOf(statuses),
        priority: randomOf(priorities),

        assignedTo: assignedUser._id,
        createdBy: ownerUser._id,

        dueDate,
      };
    });

    await TaskModel.insertMany(tasks);

    console.log(
      `[seed-demo] ✅ Inserted ${tasks.length} tasks`
    );

    console.log("owner@example.com / Passw0rd!");
    console.log("admin@example.com / Passw0rd!");
    console.log("member@example.com / Passw0rd!");
  } catch (error) {
    console.error("[seed-demo] Error:", error);
    throw error;
  }
};