import mongoose from "mongoose";
import fs from "fs";
import path from "path";
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

const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const sample = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

const statusDist: Array<{ value: keyof typeof TaskStatusEnum; weight: number }> = [
  { value: "TODO", weight: 25 },
  { value: "IN_PROGRESS", weight: 25 },
  { value: "IN_REVIEW", weight: 15 },
  { value: "DONE", weight: 25 },
  { value: "BACKLOG", weight: 10 },
];

const priorityDist: Array<{ value: keyof typeof TaskPriorityEnum; weight: number }> = [
  { value: "LOW", weight: 25 },
  { value: "MEDIUM", weight: 50 },
  { value: "HIGH", weight: 25 },
];

const weightedPick = <T extends string>(dist: Array<{ value: T; weight: number }>): T => {
  const total = dist.reduce((s, d) => s + d.weight, 0);
  let r = Math.random() * total;
  for (const d of dist) {
    if ((r -= d.weight) <= 0) return d.value;
  }
  return dist[dist.length - 1].value;
};

const taskTitleVerbs = ["Design", "Build", "Refactor", "Fix", "Test", "Deploy", "Document", "Analyze", "Integrate", "Migrate"] as const;
const taskAreas = ["API", "Frontend", "Backend", "Database", "CI/CD", "Auth", "Billing", "Analytics", "Marketing", "Infra"] as const;
const emojis = ["📊", "🚀", "🔧", "🧪", "📈", "🛠️", "🧩", "⚙️", "💡", "🗂️"] as const;

// Tên Việt Nam giả lập chân thực cho multi-tenant
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

export const seedMultiTenantData = async (): Promise<void> => {
  // Skip if multi-seed already exists
  const exists = await TaskModel.exists({ taskCode: { $regex: /^MULTI-/ } });
  if (exists) {
    console.log("[seed-multi] Skip: MULTI- dataset already present");
    return;
  }

  const USERS = Number(process.env.SEED_USERS ?? 20);
  const WS_MIN = Number(process.env.SEED_WORKSPACES_PER_USER_MIN ?? 1);
  const WS_MAX = Number(process.env.SEED_WORKSPACES_PER_USER_MAX ?? 2);
  const PROJ_MIN = Number(process.env.SEED_PROJECTS_PER_WORKSPACE_MIN ?? 3);
  const PROJ_MAX = Number(process.env.SEED_PROJECTS_PER_WORKSPACE_MAX ?? 6);
  const TASKS_TOTAL = Number(process.env.SEED_TASKS_TOTAL ?? 1000);
  const ASSIGNED_RATIO = Number(process.env.SEED_ASSIGNED_RATIO ?? 0.6); // 60% tasks assigned

  console.log(`[seed-multi] Start seeding: users=${USERS}, workspaces/user=${WS_MIN}-${WS_MAX}, projects/ws=${PROJ_MIN}-${PROJ_MAX}, tasks=${TASKS_TOTAL}`);

  // Ensure roles ready
  const ownerRole = await RoleModel.findOne({ name: Roles.OWNER });
  const adminRole = await RoleModel.findOne({ name: Roles.ADMIN });
  const memberRole = await RoleModel.findOne({ name: Roles.MEMBER });
  if (!ownerRole || !adminRole || !memberRole) {
    throw new Error("Default roles missing. Run bootstrapRoles first.");
  }

  // Create users + accounts
  const users: Array<{ user: any; email: string }> = [];
  const usedEmails = new Set<string>();
  for (let i = 1; i <= USERS; i++) {
    let person = makePerson();
    while (usedEmails.has(person.email)) {
      person = makePerson();
    }
    usedEmails.add(person.email);
    const email = person.email;
    const fullName = person.fullName;
    let user = await UserModel.findOne({ email });
    if (!user) {
      user = new UserModel({ email, name: fullName, password: "Passw0rd!" });
      await user.save();
      const acc = new AccountModel({ userId: user._id, provider: ProviderEnum.EMAIL, providerId: email });
      await acc.save();
    }
    users.push({ user, email });
  }
  console.log(`[seed-multi] Users ensured: ${users.length}`);

  // Create workspaces per user and add random members
  const allWorkspaces: any[] = [];
  for (const { user } of users) {
    const wsCount = randInt(WS_MIN, WS_MAX);
    for (let w = 0; w < wsCount; w++) {
      let workspace = await WorkspaceModel.findOne({ owner: user._id, name: { $regex: /^Multi Workspace/ } });
      if (!workspace) {
        workspace = new WorkspaceModel({
          name: `Multi Workspace ${user.name}-${w + 1}`,
          description: "Multi-tenant sample workspace",
          owner: user._id,
        });
        await workspace.save();
        const ownerMember = new MemberModel({ userId: user._id, workspaceId: workspace._id, role: ownerRole._id, joinedAt: new Date() });
        await ownerMember.save();
        user.currentWorkspace = workspace._id as mongoose.Types.ObjectId;
        await user.save();

        // add 2-5 random other members
        const extraMembersCount = randInt(2, 5);
        const shuffled = users.map(u => u.user).filter(u => String(u._id) !== String(user._id)).sort(() => Math.random() - 0.5);
        for (let k = 0; k < Math.min(extraMembersCount, shuffled.length); k++) {
          const other = shuffled[k];
          const rolePick = sample([adminRole, memberRole]);
          const m = new MemberModel({ userId: other._id, workspaceId: workspace._id, role: rolePick._id, joinedAt: new Date() });
          await m.save();
        }
      }
      allWorkspaces.push(workspace);
    }
  }
  console.log(`[seed-multi] Workspaces created: ${allWorkspaces.length}`);

  // Create projects per workspace
  const allProjects: any[] = [];
  for (const ws of allWorkspaces) {
    const projCount = randInt(PROJ_MIN, PROJ_MAX);
    for (let p = 0; p < projCount; p++) {
      const name = `Project ${sample(["Alpha","Beta","Gamma","Delta","Omega","Kappa","Sigma","Theta"])}`;
      let proj = await ProjectModel.findOne({ name, workspace: ws._id });
      if (!proj) {
        const creator = await UserModel.findById(ws.owner);
        proj = new ProjectModel({ name, description: `${name} description`, workspace: ws._id, createdBy: creator?._id });
        proj.emoji = sample(emojis as unknown as string[]);
        await proj.save();
      }
      allProjects.push({ proj, ws });
    }
  }
  console.log(`[seed-multi] Projects created: ${allProjects.length}`);

  // Build member map for assignment
  const workspaceMembers: Record<string, Array<mongoose.Types.ObjectId>> = {};
  const members = await MemberModel.find({ workspaceId: { $in: allWorkspaces.map(w => w._id) } });
  for (const m of members) {
    const key = String(m.workspaceId);
    workspaceMembers[key] ??= [];
    workspaceMembers[key].push(m.userId as unknown as mongoose.Types.ObjectId);
  }

  // Create tasks across projects
  const tasks: any[] = [];
  for (let i = 0; i < TASKS_TOTAL; i++) {
    const { proj, ws } = sample(allProjects);
    const verb = sample(taskTitleVerbs);
    const area = sample(taskAreas);
    const title = `${verb} ${area}`;
    const description = sample(["Small tweak", "Important change", "Blocking bug", "Performance improvement", "Feature enhancement"]);
    const status = weightedPick(statusDist) as unknown as keyof typeof TaskStatusEnum;
    const priority = weightedPick(priorityDist) as unknown as keyof typeof TaskPriorityEnum;

    const days = randInt(-30, 90); // allow past due
    const dueDate = Math.random() < 0.7 ? new Date(Date.now() + days * 24 * 60 * 60 * 1000) : null;

    let assignedTo: mongoose.Types.ObjectId | null = null;
    if (Math.random() < ASSIGNED_RATIO) {
      const members = workspaceMembers[String(ws._id)] ?? [];
      if (members.length > 0) assignedTo = sample(members);
    }

    tasks.push({
      taskCode: `MULTI-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
      title,
      description,
      project: proj._id,
      workspace: ws._id,
      status,
      priority,
      assignedTo,
      createdBy: ws.owner,
      dueDate,
    });
  }

  await TaskModel.insertMany(tasks);
  console.log(`[seed-multi] Inserted ${tasks.length} tasks`);

  // Optional fixtures export
  const fixturesDir = path.join(__dirname, "fixtures");
  try {
    if (!fs.existsSync(fixturesDir)) fs.mkdirSync(fixturesDir);
    const usersJson = await UserModel.find({ email: { $regex: /^user\d+@example\.com$/ } });
    const workspacesJson = await WorkspaceModel.find({ name: { $regex: /^Multi Workspace/ } });
    const projectsJson = await ProjectModel.find({ description: { $regex: /Multi|description/ } });
    const tasksJson = await TaskModel.find({ taskCode: { $regex: /^MULTI-/ } }).limit(500); // limit size
    fs.writeFileSync(path.join(fixturesDir, "users.json"), JSON.stringify(usersJson, null, 2));
    fs.writeFileSync(path.join(fixturesDir, "workspaces.json"), JSON.stringify(workspacesJson, null, 2));
    fs.writeFileSync(path.join(fixturesDir, "projects.json"), JSON.stringify(projectsJson, null, 2));
    fs.writeFileSync(path.join(fixturesDir, "tasks.json"), JSON.stringify(tasksJson, null, 2));
    console.log("[seed-multi] Fixtures exported to seeders/fixtures/");
  } catch (e) {
    console.warn("[seed-multi] Fixture export skipped:", e);
  }
};