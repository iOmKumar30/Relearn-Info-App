import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { RoleName } from "@prisma/client";
import ts from "typescript";
import { userProfileHref, getUserProfileSource } from "../libs/breadcrumbs";
import { ALL_ROLES, displayRoleName } from "../libs/roles";

type TestRow = { id: string };
type ExportFunction = (
  fetchPage: (page: number, pageSize: number) => Promise<TestRow[]>,
) => Promise<TestRow[]>;

// Extract the page-local, dependency-free export loop so both independent
// implementations can be tested without rendering Next.js or accessing a DB.
function loadExportFunction(path: string, functionName: string): ExportFunction {
  const sourceText = readFileSync(path, "utf8");
  const source = ts.createSourceFile(path, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declaration = source.statements.find(
    (statement): statement is ts.FunctionDeclaration =>
      ts.isFunctionDeclaration(statement) && statement.name?.text === functionName,
  );
  assert(declaration, `Missing ${functionName} in ${path}`);
  const script = ts.transpileModule(
    `${declaration.getText(source)}\nexports.run = ${functionName};`,
    { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } },
  ).outputText;
  const context: { exports: { run?: ExportFunction } } = { exports: {} };
  runInNewContext(script, context);
  assert(context.exports.run);
  return context.exports.run;
}

async function verifyExport(path: string, functionName: string) {
  const fetchAll = loadExportFunction(path, functionName);
  const rows = Array.from({ length: 135 }, (_, i) => ({ id: String(i) }));
  const requested: number[] = [];
  const exported = await fetchAll(async (page, pageSize) => {
    assert.equal(pageSize, 100);
    requested.push(page);
    return rows.slice((page - 1) * pageSize, page * pageSize);
  });
  assert.deepEqual(requested, [1, 2]);
  assert.deepEqual(Array.from(exported), rows);
  assert.deepEqual(Array.from(await fetchAll(async () => [])), []);

  const fullPageRequests: number[] = [];
  const exactlyOnePage = await fetchAll(async (page) => {
    fullPageRequests.push(page);
    return page === 1 ? rows.slice(0, 100) : [];
  });
  assert.deepEqual(fullPageRequests, [1, 2]);
  assert.equal(exactlyOnePage.length, 100);
  await assert.rejects(fetchAll(async (page) => {
    if (page === 1) return rows.slice(0, 100);
    throw new Error("failed page");
  }));
}

async function main() {
  assert.equal(RoleName.MASTER_TUTOR, "MASTER_TUTOR");
  assert.equal(RoleName.RELF_EMPLOYEE, "RELF_EMPLOYEE");
  assert(ALL_ROLES.includes("MASTER_TUTOR"));
  assert.equal(displayRoleName("MASTER_TUTOR"), "Master Tutor");
  assert.equal(displayRoleName("TUTOR"), "TUTOR");
  assert.equal(userProfileHref("id/1", "master-tutors"), "/users/id%2F1?from=master-tutors");
  assert.equal(getUserProfileSource("relf-employees").href, "/relf-employees");

  await verifyExport("app/(dataTables)/master-tutors/page.tsx", "fetchAllMasterTutors");
  await verifyExport("app/(dataTables)/relf-employees/page.tsx", "fetchAllRelfEmployees");

  const migration = readFileSync("prisma/migrations/20261018090000_rename_master_tutor_role/migration.sql", "utf8");
  assert.match(migration, /ALTER TYPE "RoleName" RENAME VALUE 'TUTOR_OF_TUTOR' TO 'MASTER_TUTOR'/);
  assert.doesNotMatch(migration, /\bDROP\b/i);
  console.log("Role directory checks passed: labels, links, both paginated exports, and migration SQL.");
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
