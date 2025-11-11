import mongoose from "mongoose";
import UserModel from "../models/user.model";
import AccountModel from "../models/account.model";
import WorkspaceModel from "../models/workspace.model";
import RoleModel from "../models/roles-permission.model";
import MemberModel from "../models/member.model";
import ProjectModel from "../models/project.model";
import TaskModel from "../models/task.model";
import { Roles } from "../enums/role.enum";
import { TaskPriorityEnum, TaskStatusEnum } from "../enums/task.enum";
import { ProviderEnum } from "../enums/account-provider.enum";

const randomOf = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

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

const vnFirstNames = [
  "Anh",
  "Bình",
  "Châu",
  "Dũng",
  "Hà",
  "Hương",
  "Khánh",
  "Lan",
  "Minh",
  "Nam",
  "Ngọc",
  "Phúc",
  "Quân",
  "Thảo",
  "Trang",
  "Tuấn",
  "Vân",
  "Vi",
];
const vnLastNames = [
  "Nguyễn",
  "Trần",
  "Lê",
  "Phạm",
  "Hoàng",
  "Huỳnh",
  "Phan",
  "Vũ",
  "Đặng",
  "Bùi",
  "Đỗ",
  "Hồ",
  "Ngô",
];
const pick = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const toSlug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .toLowerCase();
const makePerson = () => {
  const first = pick(vnFirstNames);
  const last = pick(vnLastNames);
  const fullName = `${last} ${first}`;
  const email = `${toSlug(first)}.${toSlug(last)}@gmail.com`;
  return { fullName, email };
};

export const seedDemoData = async (count = Number(process.env.SEED_DEMO_COUNT) || 100): Promise<void> => {
  const existingTasks = await TaskModel.countDocuments();
  if (existingTasks > 0) {
    console.log(`[seed-demo] Skip: database already has ${existingTasks} tasks`);
    return;
  }

  try {
    console.log("[seed-demo] Starting demo data seeding...");

    // 1) Ensure demo user
    const { fullName, email } = makePerson();
    let user = await UserModel.findOne({ email });
    if (!user) {
      user = new UserModel({ email, name: fullName, password: "Passw0rd!" });
      await user.save();
      const account = new AccountModel({ userId: user._id, provider: ProviderEnum.EMAIL, providerId: email });
      await account.save();
      console.log("[seed-demo] Demo user created");
    } else {
      console.log("[seed-demo] Demo user exists");
    }

    // 2) Ensure roles and pick owner role
    const ownerRole = await RoleModel.findOne({ name: Roles.OWNER });
    if (!ownerRole) {
      throw new Error("Owner role not found; ensure bootstrapRoles runs before seeding");
    }

    // 3) Create demo workspace
    let workspace = await WorkspaceModel.findOne({ owner: user._id });
    if (!workspace) {
      workspace = new WorkspaceModel({
        name: "Demo Workspace",
        description: "Workspace for demo data",
        owner: user._id,
      });
      await workspace.save();
      console.log("[seed-demo] Workspace created");

      const member = new MemberModel({
        userId: user._id,
        workspaceId: workspace._id,
        role: ownerRole._id,
        joinedAt: new Date(),
      });
      await member.save();

      user.currentWorkspace = workspace._id as mongoose.Types.ObjectId;
      await user.save();
    } else {
      console.log("[seed-demo] Workspace exists");
    }

    // 4) Create demo projects
    const projectNames = ["Project Alpha", "Project Beta", "Project Gamma", "Project Delta"];
    const projects: any[] = [];

    for (const name of projectNames) {
      let project = await ProjectModel.findOne({ name, workspace: workspace._id });
      if (!project) {
        project = new ProjectModel({ name, description: `${name} description`, workspace: workspace._id, createdBy: user._id });
        await project.save();
        console.log(`[seed-demo] Project ${name} created`);
      }
      projects.push(project);
    }

    // 5) Create demo tasks (~count)
    const statuses = Object.values(TaskStatusEnum);
    const priorities = Object.values(TaskPriorityEnum);

    const bulkTasks = Array.from({ length: count }, (_, i) => {
      const project = randomOf(projects);
      const title = `Task #${i + 1}: ${randomOf(["Design", "Build", "Fix", "Test", "Deploy"])}`;
      const description = randomOf(["Small tweak", "Important change", "Blocking bug", "Performance improvement", "Feature enhancement"]);
      const status = randomOf(statuses);
      const priority = randomOf(priorities);

      const days = Math.floor(Math.random() * 60);
      const dueDate = Math.random() < 0.7 ? new Date(Date.now() + days * 24 * 60 * 60 * 1000) : null;
      const assignedTo = Math.random() < 0.3 ? user._id : null;

      return {
        taskCode: `SEED-${Date.now()}-${i}`,
        title,
        description,
        project: project._id,
        workspace: workspace._id,
        status,
        priority,
        assignedTo,
        createdBy: user._id,
        dueDate,
      };
    });

    await TaskModel.insertMany(bulkTasks);

    console.log(`[seed-demo] Inserted ${bulkTasks.length} tasks across ${projects.length} projects`);
  } catch (error) {
    console.error("[seed-demo] Error:", error);
    throw error;
  }
};