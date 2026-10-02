import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("P0: la route de réinitialisation backend est absente", async () => {
  const server = await source("server.js");
  assert.doesNotMatch(server, /\/api\/auth\/reset-password/);
});

test("P0: les fichiers locaux ne sont pas publiés statiquement", async () => {
  const server = await source("server.js");
  assert.doesNotMatch(server, /express\.static\s*\(/);
});

test("P0: le sérialiseur utilisateur applique une liste blanche 2FA", async () => {
  const { serializeUser } = await import("../Shared/Serializers/userSerializer.js");
  const user = serializeUser({
    uid: "user-1",
    email: "user@example.test",
    role: "student",
    twoFactorEnabled: true,
    twoFactorSecret: "must-not-leak",
    twoFactorVerifiedAt: "must-not-leak"
  });
  assert.equal(user.twoFactorEnabled, true);
  assert.equal("twoFactorSecret" in user, false);
  assert.equal("twoFactorVerifiedAt" in user, false);
});

test("P0: aucun rôle employee par défaut ne subsiste dans le middleware actif", async () => {
  const middleware = await source("Shared/Authentication middleware/authMiddleware.js");
  assert.doesNotMatch(middleware, /\|\|\s*["']employee["']/);
  assert.doesNotMatch(middleware, /\?\?\s*["']employee["']/);
});

test("P0: l'attribution du rôle admin est réservée au super-administrateur", async () => {
  const controller = await source("Auth/Roles & Permissions/roleController.js");
  assert.match(controller, /requestedRole === "admin" && req\.user\.role !== "super_admin"/);
});

test("P1: le serveur applique les en-têtes, CORS restreint et limite les tentatives", async () => {
  const server = await source("server.js");
  assert.match(server, /app\.use\(helmet/);
  assert.match(server, /CORS_ORIGINS/);
  assert.match(server, /authenticationLimiter/);
});
