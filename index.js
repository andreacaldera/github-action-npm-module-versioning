const { Toolkit } = require('actions-toolkit');
const { execSync } = require('child_process');
const fs = require('fs');

// Change working directory if user defined PACKAGEJSON_DIR
if (process.env.PACKAGEJSON_DIR) {
  process.env.GITHUB_WORKSPACE = `${process.env.GITHUB_WORKSPACE}/${process.env.PACKAGEJSON_DIR}`;
  process.chdir(process.env.GITHUB_WORKSPACE);
}

Toolkit.run(async (tools) => {
  const runCommand = async (command) => {
    console.log(`Running command [${command}]`);
    try {
      const result = await execSync(command);
      return result?.toString();
    } catch (error) {
      console.error(`Unable to run [${command}]`, error);
    }
  };

  await tools.runInWorkspace('git', [
    'config',
    'user.name',
    `"${process.env.GITHUB_USER || 'Automated Version Bump'}"`,
  ]);
  await tools.runInWorkspace('git', [
    'config',
    'user.email',
    `"${process.env.GITHUB_EMAIL || 'github-action-npm-module-versioning@users.noreply.github.com'}"`,
  ]);

  const pkg = tools.getPackageJSON();

  console.log(`Current version is ${pkg.version}`);

  const tagsResults = await execSync(`git tag -l`);
  const tags = tagsResults
    .toString()
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  const latestTag = tags.reduce((acc, item) => (acc >= item ? acc : item), tags[0]);
  console.log(`Latest tag ${latestTag}`);

  const bumpVersion = async (releaseType) => {
    console.log(`${releaseType} release`);
    await runCommand(`yarn version --${releaseType}`);
    await runCommand(`git push origin ${currentBranch}`);
  };

  fs.writeFileSync('package.json', JSON.stringify({ ...pkg, version: latestTag }, null, 2));
  const currentBranch = /refs\/[a-zA-Z]+\/(.*)/.exec(process.env.GITHUB_REF)[1];
  const commits = await runCommand(`git log origin/main...${currentBranch} --oneline`);
  if (commits.includes('major')) {
    await bumpVersion('major');
  } else if (commits.includes('minor')) {
    await bumpVersion('minor');
  } else {
    await bumpVersion('patch');
  }
});
