// Release check for a PR into master:
// - the PR comes from dev, in this repo
// - package.json has a newer version than master
// - the PR title has that version, e.g. "v7.0.0"
//
// Usage: node .github/scripts/release-check.js, run in a checkout of the PR head. Exits 1 if it fails.
// Env: GITHUB_REPOSITORY, TITLE, HEAD_REF, HEAD_REPO (the PR's).
// The result goes to the step output `description`, the workflows set it as the "Release check"
// commit status (master requires it).
const { appendFileSync } = require("fs");
const { execSync } = require("child_process");
const path = require("path");

const { GITHUB_REPOSITORY, GITHUB_OUTPUT, TITLE = "", HEAD_REF, HEAD_REPO } = process.env;

const parts = (v) => v.split("-")[0].split(".").map(Number);
function newer(a, b) {
  const [x, y] = [parts(a), parts(b)];
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i];
  return false;
}

function check() {
  if (HEAD_REPO !== GITHUB_REPOSITORY || HEAD_REF !== "dev")
    return { error: "Releases are PRs from dev into master. Other branches and forks go into dev." };

  const version = require(path.resolve("package.json")).version;
  execSync("git fetch --quiet --depth=1 origin master");
  const released = JSON.parse(execSync("git show origin/master:package.json")).version;
  if (!newer(version, released))
    return { error: `package.json is ${version}, master is ${released}. Bump the version on dev.` };

  // "v7.0.0" or "7.0.0", not part of a longer version like 7.0.0.1 or 17.0.0
  const escaped = version.replace(/[.+]/g, "\\$&");
  if (!new RegExp(`(^|[^\\w.])v?${escaped}(?![\\w.-])`).test(TITLE))
    return { error: `The PR title has to include the version from package.json, e.g. "v${version}".` };

  return { ok: `Release ${released} -> ${version}` };
}

const { ok, error } = check();
if (error) {
  console.log(`::error::${error}`);
  process.exitCode = 1;
} else console.log(ok);

// Commit status descriptions are max 140 characters
if (GITHUB_OUTPUT) appendFileSync(GITHUB_OUTPUT, `description=${(error || ok).slice(0, 140)}\n`);
