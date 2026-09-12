import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn, spawnSync, execFileSync, type ChildProcess } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const directory = mkdtempSync(path.join(tmpdir(), "communication-test-"));
const databaseUrl = `file:${path.join(directory, "test.db").replaceAll("\\", "/")}`;
const port = 3317;
const base = `http://127.0.0.1:${port}`;
const env: NodeJS.ProcessEnv = { ...process.env, DATABASE_URL: databaseUrl, SESSION_SECRET: "isolated-test-secret-at-least-32-characters-long", COOKIE_SECURE: "false", APP_URL: base, UPLOAD_DIR: path.join(directory, "uploads"), NODE_ENV: "production", RUST_LOG: "info" };
const db = new PrismaClient({ datasourceUrl: databaseUrl });
let server: ChildProcess;
let serverLog = "";
let alice = "", bob = "", outsider = "", admin = "";
let aliceId = "", bobId = "", adminId = "";
let conversationId = "", fileUrl = "";
const password = "a-strong-test-password";

async function api(route: string, cookie = "", body?: unknown, method = body === undefined ? "GET" : "POST") {
  return fetch(`${base}${route}`, { method, headers: { Cookie: cookie, ...(body === undefined ? {} : { "Content-Type": "application/json" }) }, body: body === undefined ? undefined : JSON.stringify(body), redirect: "manual" });
}
async function login(email: string) {
  const res = await api("/api/auth/login", "", { email, password });
  assert.equal(res.status, 200);
  return res.headers.get("set-cookie")!.split(";")[0];
}

before(async () => {
  const cli = path.resolve("node_modules/prisma/build/index.js");
  execFileSync(process.execPath, [cli, "migrate", "deploy"], { env: { ...env, DATABASE_URL: `file:${path.join(directory, "fresh.db").replaceAll("\\", "/")}` }, stdio: "pipe" });
  // Start from the pre-release schema and baseline it, as an existing deployment would.
  execFileSync(process.execPath, [cli, "db", "execute", "--file", "prisma/migrations/0001_initial/migration.sql", "--url", databaseUrl], { env, stdio: "pipe" });
  execFileSync(process.execPath, [cli, "db", "execute", "--stdin", "--url", databaseUrl], { env, stdio: ["pipe", "pipe", "pipe"],
    input: "INSERT INTO User (id,email,name,password) VALUES ('legacy','legacy@test.invalid','Legacy user','unused');" });
  execFileSync(process.execPath, [cli, "migrate", "resolve", "--applied", "0001_initial"], { env, stdio: "pipe" });
  execFileSync(process.execPath, [cli, "migrate", "deploy"], { env, stdio: "pipe" });
  assert.equal((await db.user.findUniqueOrThrow({ where: { id: "legacy" } })).sessionVersion, 0);
  const hash = await bcrypt.hash(password, 4);
  for (const name of ["alice", "bob", "outsider", "admin"]) {
    const user = await db.user.create({ data: { name, email: `${name}@test.invalid`, password: hash, role: name === "admin" ? "ADMIN" : "USER" } });
    if (name === "alice") aliceId = user.id;
    if (name === "bob") bobId = user.id;
    if (name === "admin") adminId = user.id;
  }
  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", String(port)], { env, stdio: "pipe" });
  server.stdout?.on("data", (chunk) => { serverLog += chunk; });
  server.stderr?.on("data", (chunk) => { serverLog += chunk; });
  let ready = false;
  for (let i = 0; i < 60; i++) {
    if (server.exitCode !== null) throw new Error(serverLog);
    if (await fetch(`${base}/login`).then((r) => r.ok).catch(() => false)) { ready = true; break; }
    await delay(500);
  }
  assert.ok(ready, serverLog);
  alice = await login("alice@test.invalid"); bob = await login("bob@test.invalid");
  outsider = await login("outsider@test.invalid"); admin = await login("admin@test.invalid");
}, { timeout: 60000 });

after(async () => {
  if (server && server.exitCode === null) {
    const exited = new Promise<void>((resolve) => server.once("exit", () => resolve()));
    server.kill();
    await exited;
  }
  await db.$disconnect();
  rmSync(directory, { recursive: true, force: true });
});

test("anonymous access, malformed login and cross-origin writes are rejected", async () => {
  assert.equal((await api("/api/contacts")).status, 401);
  assert.equal((await api("/api/auth/login", "", { email: {}, password })).status, 400);
  assert.equal((await fetch(`${base}/api/auth/login`, { method: "POST", headers: { Origin: "https://attacker.invalid", "Content-Type": "application/json" }, body: JSON.stringify({ email: "alice@test.invalid", password }) })).status, 403);
  assert.ok(!(await (await fetch(`${base}/login`)).text()).includes("demo1234"));
});

test("the first administrator requires explicit credentials and cannot be overwritten by bootstrap", async () => {
  const seedEnv = { ...env, DATABASE_URL: `file:${path.join(directory, "fresh.db").replaceAll("\\", "/")}`,
    INITIAL_ADMIN_NAME: "", INITIAL_ADMIN_EMAIL: "", INITIAL_ADMIN_PASSWORD: "" };
  const args = ["node_modules/tsx/dist/cli.mjs", "prisma/seed.ts"];
  const missing = spawnSync(process.execPath, args, { env: seedEnv, encoding: "utf8" });
  assert.equal(missing.status, 1);
  const setupEnv = { ...seedEnv, INITIAL_ADMIN_NAME: "Test Owner", INITIAL_ADMIN_EMAIL: "owner@test.invalid", INITIAL_ADMIN_PASSWORD: "unique-bootstrap-test-password" };
  const created = spawnSync(process.execPath, args, { env: setupEnv, encoding: "utf8" });
  assert.equal(created.status, 0, created.stderr);
  assert.ok(!created.stdout.includes(setupEnv.INITIAL_ADMIN_PASSWORD));
  const repeat = spawnSync(process.execPath, args, { env: { ...setupEnv, INITIAL_ADMIN_PASSWORD: "different-bootstrap-password" }, encoding: "utf8" });
  assert.equal(repeat.status, 1);
  const fresh = new PrismaClient({ datasourceUrl: setupEnv.DATABASE_URL });
  try {
    const users = await fresh.user.findMany();
    assert.equal(users.length, 1);
    assert.equal(users[0].role, "ADMIN");
    assert.ok(await bcrypt.compare(setupEnv.INITIAL_ADMIN_PASSWORD, users[0].password));
    assert.equal(await fresh.message.count(), 0);
  } finally { await fresh.$disconnect(); }
});

test("login HTML and its client scripts contain no demo credentials", async () => {
  const html = await (await fetch(`${base}/login`)).text();
  const scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((match) => match[1]);
  const content = [html, ...await Promise.all(scripts.map(async (url) => (await fetch(new URL(url, base))).text()))].join("\n");
  for (const value of ["demo1234", "admin1234", "kunde@beispiel.de", "partner@beispiel.de", "admin@beispiel.de"]) {
    assert.ok(!content.includes(value), `Public login asset exposes ${value}`);
  }
  assert.ok(html.includes("Support kontaktieren"));
});

test("public support does not expose account-deletion controls", async () => {
  const publicHTML = await (await fetch(`${base}/support`)).text();
  assert.ok(!publicHTML.includes("Aktuelles Passwort"));
  const privateHTML = await (await fetch(`${base}/support`, { headers: { Cookie: bob } })).text();
  assert.ok(privateHTML.includes("Aktuelles Passwort"));
});

test("contacts and simultaneous conversation creation produce a single usable chat", async () => {
  assert.equal((await api("/api/contacts", alice, { userId: bobId })).status, 200);
  const results = await Promise.all([api("/api/conversations", alice, { contactUserId: bobId }), api("/api/conversations", bob, { contactUserId: aliceId })]);
  for (const res of results) assert.equal(res.status, 200);
  const ids = await Promise.all(results.map(async (res) => (await res.json()).conversation.id));
  assert.equal(ids[0], ids[1]); conversationId = ids[0];
  assert.equal((await api(`/api/conversations/${conversationId}`, outsider)).status, 404);
});

test("valid messages persist; whitespace, invalid types and foreign attachment URLs do not", async () => {
  const route = `/api/conversations/${conversationId}`;
  for (const body of [{ content: "  " }, { content: "hello", type: "INVALID" }, { content: {}, type: "TEXT" }, { type: "IMAGE", fileUrl: "https://attacker.invalid/a.png" }]) {
    assert.equal((await api(route, alice, body)).status, 400);
  }
  assert.equal((await api(route, alice, { content: "Hello Bob", type: "TEXT" })).status, 200);
  assert.equal(await db.message.count({ where: { conversationId } }), 1);
  assert.equal(await db.notification.count({ where: { userId: bobId } }), 1);
});

test("uploads reject spoofing and only the sender and recipient can fetch media", async () => {
  const form = new FormData();
  form.set("file", new Blob(["<html>not an image</html>"], { type: "image/png" }), "evil.html");
  assert.equal((await fetch(`${base}/api/upload`, { method: "POST", headers: { Cookie: alice }, body: form })).status, 400);
  const bytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6oL8AAAAASUVORK5CYII=", "base64");
  form.set("file", new Blob([bytes], { type: "image/png" }), "photo.html");
  const upload = await fetch(`${base}/api/upload`, { method: "POST", headers: { Cookie: alice }, body: form });
  assert.equal(upload.status, 200); fileUrl = (await upload.json()).fileUrl;
  assert.ok(fileUrl.endsWith(".png"));
  assert.equal((await api(`/api/conversations/${conversationId}`, alice, { type: "IMAGE", fileUrl, fileName: "photo.png" })).status, 200);
  assert.equal((await api(fileUrl)).status, 401);
  assert.equal((await api(fileUrl, outsider)).status, 404);
  const media = await api(fileUrl, bob);
  assert.equal(media.status, 200); assert.equal(media.headers.get("cache-control"), "private, no-store");
  assert.deepEqual(Buffer.from(await media.arrayBuffer()), bytes);
  const suffix = await fetch(`${base}${fileUrl}`, { headers: { Cookie: bob, Range: "bytes=-5" } });
  assert.equal(suffix.status, 206); assert.deepEqual(Buffer.from(await suffix.arrayBuffer()), bytes.subarray(-5));
  assert.equal((await fetch(`${base}${fileUrl}`, { headers: { Cookie: bob, Range: "bytes=99999-" } })).status, 416);
  assert.equal((await api(`/api/conversations/${conversationId}`, bob, { type: "IMAGE", fileUrl })).status, 400);
});

test("reports reach admins and blocking prevents messages and re-adding", async () => {
  assert.equal((await api("/api/safety", bob, { userId: aliceId, action: "report", reason: "Test report" })).status, 200);
  assert.equal((await api("/api/admin/reports", bob)).status, 403);
  const reports = (await (await api("/api/admin/reports", admin)).json()).reports;
  assert.equal(reports.length, 1);
  assert.equal((await api("/api/admin/reports", admin, { id: reports[0].id }, "PATCH")).status, 200);
  assert.equal((await api("/api/safety", bob, { userId: aliceId, action: "block" })).status, 200);
  assert.equal((await api(`/api/conversations/${conversationId}`, alice, { content: "blocked" })).status, 403);
  assert.equal((await api("/api/contacts", alice, { userId: bobId })).status, 403);
  assert.ok(!(await (await api("/api/users", alice)).json()).users.some((user: { id: string }) => user.id === bobId));
  assert.ok(!(await (await api("/api/users", bob)).json()).users.some((user: { id: string }) => user.id === aliceId));
  assert.equal((await api("/api/safety", bob, { userId: aliceId, action: "unblock" })).status, 200);
});

test("admin action buttons' DELETE endpoints deactivate and delete, preserving self-protection", async () => {
  const user = await db.user.create({ data: { name: "Action test", email: "actions@test.invalid", password: await bcrypt.hash(password, 4) } });
  const cookie = await login("actions@test.invalid");
  const route = `/api/admin/users/${user.id}`;
  assert.equal((await api(route, outsider, undefined, "DELETE")).status, 403);
  assert.equal((await api(`/api/admin/users/${adminId}`, admin, undefined, "DELETE")).status, 400);
  assert.equal((await api(`/api/admin/users/${adminId}?hard=true`, admin, undefined, "DELETE")).status, 400);
  const deactivated = await api(route, admin, undefined, "DELETE");
  assert.equal(deactivated.status, 200);
  assert.equal((await deactivated.json()).user.isActive, false);
  assert.equal((await db.user.findUniqueOrThrow({ where: { id: user.id } })).isActive, false);
  assert.equal((await api("/api/contacts", cookie)).status, 401);
  const deleted = await api(`${route}?hard=true`, admin, undefined, "DELETE");
  assert.equal(deleted.status, 200);
  assert.equal((await deleted.json()).deleted, true);
  assert.equal(await db.user.findUnique({ where: { id: user.id } }), null);
});

test("deactivation, reactivation, password reset and demotion invalidate old authority", async () => {
  const generated = await api("/api/admin/users", admin, { name: "Generated", email: "generated@test.invalid", generatePassword: true });
  assert.equal(generated.status, 200);
  assert.ok((await generated.json()).credentials.password.length >= 12);
  assert.equal((await api("/api/admin/users", admin, { name: 123, email: "invalid" })).status, 400);
  assert.equal((await api(`/api/admin/users/${aliceId}`, admin, { isActive: false }, "PATCH")).status, 200);
  assert.equal((await api("/api/contacts", alice)).status, 401);
  assert.equal((await api(`/api/admin/users/${aliceId}`, admin, { isActive: true }, "PATCH")).status, 200);
  assert.equal((await api("/api/contacts", alice)).status, 401);
  alice = await login("alice@test.invalid");
  assert.equal((await api(`/api/admin/users/${aliceId}`, admin, { password: "a-different-strong-password" }, "PATCH")).status, 200);
  assert.equal((await api("/api/contacts", alice)).status, 401);
  await db.user.update({ where: { id: adminId }, data: { role: "USER" } });
  assert.equal((await api("/api/admin/users", admin)).status, 403);
  await db.user.update({ where: { id: adminId }, data: { role: "ADMIN" } });
});

test("hard deletion works for a user who has messages and conversations", async () => {
  assert.equal((await api(`/api/admin/users/${aliceId}?hard=true`, admin, undefined, "DELETE")).status, 200);
  assert.equal(await db.conversation.count({ where: { id: conversationId } }), 0);
  assert.equal((await api(fileUrl, bob)).status, 404);
});

test("persistent login throttling rejects repeated attempts", async () => {
  let res: Response | undefined;
  for (let i = 0; i < 11; i++) res = await api("/api/auth/login", "", { email: "missing@test.invalid", password });
  assert.equal(res?.status, 429); assert.equal(res?.headers.get("retry-after"), "900");
});

test("successful logins do not accumulate a lockout", async () => {
  for (let i = 0; i < 12; i++) await login("bob@test.invalid");
});

test("self-service account deletion requires the password and revokes the session", async () => {
  assert.equal((await api("/api/account/delete", outsider, { password: "wrong" })).status, 403);
  assert.equal((await api("/api/account/delete", outsider, { password })).status, 200);
  assert.equal((await api("/api/contacts", outsider)).status, 401);
});
