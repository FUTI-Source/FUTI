const { spawnSync } = require("node:child_process");

for (const key of Object.keys(process.env)) {
  if (/^npm_?config_.*cache[-_]dir$/i.test(key)) {
    delete process.env[key];
  }
}

const result = spawnSync("npm", ["ci"], {
  env: process.env,
  stdio: "inherit",
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
