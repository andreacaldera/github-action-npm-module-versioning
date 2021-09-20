const { Toolkit } = require('actions-toolkit');
const { execSync } = require('child_process');

const fs = require('fs');

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

  const pkgMain = JSON.parse(await execSync(`git show origin/main:package.json`));
  const mainVersion = pkgMain.version;
  console.log(`Main version ${mainVersion}`);

  const bumpVersion = async (releaseType) => {
    console.log(`${releaseType} release`);
    await runCommand(`yarn version --${releaseType} --no-git-tag-version`);
    await runCommand(`git add package.json`);
    const newVersion = JSON.parse(fs.readFileSync('package.json')).version;
    await runCommand(`git commit -m 'ci: v${newVersion}'`);
    await runCommand(`git push origin ${currentBranch}`);
  };

  fs.writeFileSync('package.json', JSON.stringify({ ...pkg, version: mainVersion }, null, 2));
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
