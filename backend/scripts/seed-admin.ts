import { PrismaClient, UserRole } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

type SupabaseUser = {
  id: string;
  email?: string;
};

type SupabaseAdminResponse = {
  user?: SupabaseUser;
  msg?: string;
  message?: string;
  error?: string;
  error_description?: string;
};

type AuthUserRow = {
  id: string;
  email: string | null;
};

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
});

function writeLine(message: string): void {
  process.stdout.write(`${message}\n`);
}

function writeError(message: string): void {
  process.stderr.write(`${message}\n`);
}

function showUsage(): void {
  writeLine("Seed admin account into Supabase Auth and application database.");
  writeLine("");
  writeLine("Required env:");
  writeLine("  SUPABASE_URL=https://<project>.supabase.co");
  writeLine("  SUPABASE_SERVICE_ROLE_KEY=<service-role-key>");
  writeLine("  SUPABASE_DB_URL=<postgres-url>");
  writeLine("  ADMIN_EMAIL=admin@example.com");
  writeLine("  ADMIN_PASSWORD=<strong-password>");
  writeLine("");
  writeLine("Note:");
  writeLine("  SUPABASE_DB_URL must allow reading auth.users.");
  writeLine("");
  writeLine("Run:");
  writeLine("  npm run seed:admin");
}

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function buildHeaders(serviceRoleKey: string): HeadersInit {
  return {
    apikey: serviceRoleKey,
    authorization: `Bearer ${serviceRoleKey}`,
    "content-type": "application/json"
  };
}

async function readJson(response: Response): Promise<SupabaseAdminResponse> {
  const text = await response.text();
  if (!text.trim()) {
    return {};
  }

  return JSON.parse(text) as SupabaseAdminResponse;
}

function getSupabaseErrorMessage(payload: SupabaseAdminResponse): string {
  return payload.msg ?? payload.message ?? payload.error_description ?? payload.error ?? "Supabase Admin API request failed";
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function getUserFromPayload(payload: SupabaseAdminResponse): SupabaseUser | null {
  const directUser = payload as SupabaseAdminResponse & SupabaseUser;
  return payload.user ?? (typeof directUser.id === "string" ? directUser : null);
}

async function requestSupabase(
  url: string,
  init: RequestInit,
  serviceRoleKey: string
): Promise<SupabaseAdminResponse> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...buildHeaders(serviceRoleKey),
      ...init.headers
    }
  });
  const payload = await readJson(response);

  if (!response.ok) {
    throw new Error(getSupabaseErrorMessage(payload));
  }

  return payload;
}

async function findSupabaseAuthUserByEmail(email: string): Promise<SupabaseUser | null> {
  const rows = await prisma.$queryRaw<AuthUserRow[]>`
    SELECT id, email
    FROM auth.users
    WHERE lower(email) = lower(${email})
    LIMIT 1
  `;
  const user = rows[0];

  return user ? { id: user.id, email: user.email ?? undefined } : null;
}

async function createSupabaseAdminUser(
  supabaseUrl: string,
  serviceRoleKey: string,
  email: string,
  password: string
): Promise<SupabaseUser> {
  const payload = await requestSupabase(
    `${supabaseUrl}/auth/v1/admin/users`,
    {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { role: UserRole.ADMIN },
        app_metadata: { role: UserRole.ADMIN }
      })
    },
    serviceRoleKey
  );
  const user = getUserFromPayload(payload);

  if (!user?.id) {
    throw new Error("Supabase Admin API did not return created user id");
  }

  return user;
}

async function updateSupabaseAdminUser(
  supabaseUrl: string,
  serviceRoleKey: string,
  userId: string,
  password: string
): Promise<void> {
  await requestSupabase(
    `${supabaseUrl}/auth/v1/admin/users/${userId}`,
    {
      method: "PUT",
      body: JSON.stringify({
        password,
        email_confirm: true,
        user_metadata: { role: UserRole.ADMIN },
        app_metadata: { role: UserRole.ADMIN }
      })
    },
    serviceRoleKey
  );
}

async function upsertDatabaseAdminUser(user: SupabaseUser, email: string): Promise<void> {
  await prisma.user.upsert({
    where: { id: user.id },
    create: {
      id: user.id,
      email,
      role: UserRole.ADMIN
    },
    update: {
      email,
      role: UserRole.ADMIN
    }
  });
}

async function main(): Promise<void> {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    showUsage();
    return;
  }

  const supabaseUrl = getRequiredEnv("SUPABASE_URL").replace(/\/$/, "");
  const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const email = normalizeEmail(getRequiredEnv("ADMIN_EMAIL"));
  const password = getRequiredEnv("ADMIN_PASSWORD");

  if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD must be at least 8 characters");
  }

  const existingUser = await findSupabaseAuthUserByEmail(email);
  const user = existingUser ?? (await createSupabaseAdminUser(supabaseUrl, serviceRoleKey, email, password));

  if (existingUser) {
    await updateSupabaseAdminUser(supabaseUrl, serviceRoleKey, existingUser.id, password);
  }

  await upsertDatabaseAdminUser(user, email);

  writeLine(existingUser ? "Admin account updated." : "Admin account created.");
  writeLine(`Email: ${email}`);
  writeLine(`Role: ${UserRole.ADMIN}`);
}

main()
  .catch((error: unknown) => {
    writeError(error instanceof Error ? error.message : "Failed to seed admin account");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
