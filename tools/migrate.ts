import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import os from "os";

const srcPath = "prisma/migrations";
const distPath = fs.mkdtempSync(path.join(os.tmpdir(), "prisma-migrations"));
const DB = process.env.DB_NAME!;

const execAsync = promisify(exec);

type D1List = {
  uuid: string;
  name: string;
  version: string;
  created_at: string;
};

export const getD1List = async () => {
  const list = await execAsync("wrangler d1 list --json").then(
    ({ stdout }) => JSON.parse(stdout) as D1List[]
  );
  return list;
};

export const migrationD1 = async (dbName: string, dir: string) => {
  return execAsync(
    `wrangler d1 migrations apply --remote ${dbName} -c ${dir}/wrangler.toml`
  ).then(({ stdout, stderr }) => stderr || stdout);
};

const main = async () => {
  if (fs.existsSync(distPath)) {
    fs.rmSync(distPath, { recursive: true });
  }

  fs.mkdirSync(distPath, { recursive: true });
  const migrations = fs.readdirSync(srcPath, { withFileTypes: true });
  migrations
    .filter((v) => {
      return v.isDirectory();
    })
    .sort((a, b) => (a.name < b.name ? -1 : 1))
    .forEach(({ name }) => {
      const sql = fs.readFileSync(`${srcPath}/${name}/migration.sql`, "utf8");
      fs.writeFileSync(`${distPath}/${name}.sql`, sql);
    });

  const list = await getD1List();
  const uuid = list.find((v) => v.name === DB)?.uuid;
  if (uuid) {
    fs.writeFileSync(
      `${distPath}/wrangler.toml`,
      `[[d1_databases]]
binding = "DB"
database_name = "${DB}"
database_id ="${uuid}"
migrations_dir = "./"`
    );
  }
  const result = await migrationD1(DB, distPath);
  console.log(result);
  fs.rmSync(distPath, { recursive: true });
};

main();
