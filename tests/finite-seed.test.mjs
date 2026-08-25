import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import test from "node:test";

test("migration seeds Hong Kong and Shanghai with sourced snapshots", () => {
  assert.equal(existsSync("drizzle"), true);
  const sqlFiles = readdirSync("drizzle").filter((file) => file.endsWith(".sql"));
  assert.ok(sqlFiles.length >= 1);

  const sql = sqlFiles
    .map((file) => readFileSync(`drizzle/${file}`, "utf8"))
    .join("\n");

  assert.match(sql, /INSERT INTO ["`]cities["`]/i);
  assert.match(sql, /香港/);
  assert.match(sql, /上海/);
  assert.match(sql, /Hong Kong/);
  assert.match(sql, /Shanghai/);
  assert.match(sql, /INSERT INTO ["`]hotels["`]/i);
  assert.match(sql, /INSERT INTO ["`]price_snapshots["`]/i);
  assert.match(sql, /StayWorth prototype fixture/);
  assert.match(sql, /用户提供的价格样例（日期为原型）/);
});
