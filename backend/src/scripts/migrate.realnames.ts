import "dotenv/config";
import mongoose from "mongoose";
import connectDatabase from "../config/database.config";
import UserModel from "../models/user.model";
import AccountModel from "../models/account.model";
import { ProviderEnum } from "../enums/account-provider.enum";

// Helper: realistic Vietnamese names and email slug
const vnFirstNames = [
  "Anh","Bình","Châu","Dũng","Hà","Hương","Khánh","Lan","Minh","Nam","Ngọc","Phúc","Quân","Thảo","Trang","Tuấn","Vân","Vi",
];
const vnLastNames = [
  "Nguyễn","Trần","Lê","Phạm","Hoàng","Huỳnh","Phan","Vũ","Đặng","Bùi","Đỗ","Hồ","Ngô",
];
const pick = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const toSlug = (s: string) => s
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

// Decide which users to migrate (placeholder names/emails)
const isPlaceholderUser = (name?: string) => {
  if (!name) return true;
  return /^(User \d+|Demo User)$/i.test(name.trim());
};
const isPlaceholderEmail = (email?: string) => {
  if (!email) return false;
  return /^user\d+@example\.com$/i.test(email) || /^(demo@example\.com)$/i.test(email) || /@example\.(com|vn)$/i.test(email);
};

(async () => {
  try {
    await connectDatabase();

    // Build used emails set from Users and Accounts (EMAIL provider)
    const allUsers = await UserModel.find({}, { email: 1 }).lean();
    const allEmailAccounts = await AccountModel.find({ provider: ProviderEnum.EMAIL }, { providerId: 1 }).lean();
    const usedEmails = new Set<string>();
    for (const u of allUsers) if (u.email) usedEmails.add(u.email.toLowerCase());
    for (const a of allEmailAccounts) if (a.providerId) usedEmails.add(a.providerId.toLowerCase());

    const candidates = await UserModel.find({
      $or: [
        { email: { $not: /@gmail\.com$/i } },
        { name: { $regex: /^(User \d+|Demo User)$/i } },
      ],
    });

    console.log(`[migrate:realnames] Candidates found: ${candidates.length}`);
    let changed = 0;

    for (const user of candidates) {
      const shouldChangeEmail = !!user.email && !/@gmail\.com$/i.test(user.email) || isPlaceholderEmail(user.email || undefined);
      const shouldChangeName = isPlaceholderUser(user.name || undefined);
      if (!shouldChangeEmail && !shouldChangeName) continue;

      let newEmail = "";
      let newName = user.name || "";

      if (isPlaceholderEmail(user.email || undefined) || shouldChangeName) {
        // Generate completely new person/email (gmail.com)
        let person = makePerson();
        let tries = 0;
        while (usedEmails.has(person.email.toLowerCase())) {
          person = makePerson();
          if (++tries > 100) throw new Error("Could not generate unique email after 100 tries");
        }
        newName = person.fullName;
        newEmail = person.email.toLowerCase();
      } else {
        // Keep local part, switch domain to gmail.com
        const local = toSlug((user.email || "").split("@")[0] || newName || "user");
        let candidate = `${local}@gmail.com`;
        let suffix = 0;
        while (usedEmails.has(candidate.toLowerCase())) {
          suffix++;
          candidate = `${local}${suffix}@gmail.com`;
        }
        newEmail = candidate.toLowerCase();
      }

      usedEmails.add(newEmail);
      if (shouldChangeName) user.name = newName;
      if (shouldChangeEmail) user.email = newEmail;

      await user.save();

      // Update Account providerId for EMAIL accounts
      const emailAccount = await AccountModel.findOne({ userId: user._id, provider: ProviderEnum.EMAIL });
      if (emailAccount && shouldChangeEmail) {
        emailAccount.providerId = user.email;
        await emailAccount.save();
      }

      changed++;
      console.log(`[migrate:realnames] Updated user ${user._id}: name='${user.name}' email='${user.email}'`);
    }

    console.log(`[migrate:realnames] Migration completed. Users changed: ${changed}`);
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error("[migrate:realnames] Error:", err);
    process.exit(1);
  }
})();