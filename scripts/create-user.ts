import { hash } from "bcryptjs";
import mongoose from "mongoose";
import { User } from "../lib/models/user";
import { ensureUserRoles } from "../lib/roles";

function usage() {
  console.error(
    `Usage:
  npm run create-user -- --name "Saar" --email you@example.com --password '…'

Creates an owner account. Members must register via an invite link.`
  );
}

function getArg(flag: string) {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return undefined;
  }
  return process.argv[index + 1];
}

async function main() {
  const name = getArg("--name");
  const email = getArg("--email")?.trim().toLowerCase();
  const password = getArg("--password");

  if (!name || !email || !password) {
    usage();
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("MONGODB_URI is not set. Load .env.local or export it.");
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  await ensureUserRoles();

  const existing = await User.findOne({ email });
  if (existing) {
    console.error(`A user with email ${email} already exists.`);
    process.exit(1);
  }

  const user = await User.create({
    name,
    email,
    passwordHash: await hash(password, 12),
    role: "owner",
  });

  console.log(`Created owner ${user.email} (${user._id.toString()})`);
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
