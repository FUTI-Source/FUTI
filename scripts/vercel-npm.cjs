const { spawnSync } = require("node:child_process");

for (const key of Object.keys(process.env)) {
  if (/^npm_?config_.*cache[-_]dir$/i.test(key)) {
    delete process.env[key];
  }
}

const command = process.argv.slice(2);
if (command.length === 0) {
  throw new Error("Pass an npm command to run.");
}

const result = spawnSync("npm", command, {
  env: process.env,
  stdio: "inherit",
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
