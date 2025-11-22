import * as fs from "fs";
import * as readline from "readline";
import { exec, echo, exit } from "shelljs";
import chalk from "chalk";

interface PackageJson {
  version: string;
  [key: string]: any;
}

// 创建 readline 接口用于读取用户输入
function createReadlineInterface(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

// 读取用户输入
function promptUser(question: string): Promise<string> {
  const rl = createReadlineInterface();
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  const CURRENT_BRANCH = exec("git rev-parse --abbrev-ref HEAD", {
    silent: true,
  }).stdout.trim();

  // 1. 判断分支
  if (CURRENT_BRANCH !== "master") {
    echoExit("必须使用master分支，且需要有master分支发布权限");
    exit(1);
  }

  // 2. 检查代码是否最新
  echoInfo("正在检查远程代码更新...");

  // 获取远程更新
  const fetchResult = exec("git fetch origin", { silent: true });
  if (fetchResult.code !== 0) {
    echoExit("Error: 无法获取远程更新，请检查网络连接");
    exit(1);
  }

  // 比较本地和远程的差异
  const localCommit = exec("git rev-parse HEAD", {
    silent: true,
  }).stdout.trim();
  const remoteCommit = exec("git rev-parse origin/master", {
    silent: true,
  }).stdout.trim();

  if (localCommit !== remoteCommit) {
    echoExit(
      "Error: 本地代码不是最新的，请先执行 'git pull' 拉取最新代码后再操作"
    );
    echoInfo(`本地提交: ${localCommit.substring(0, 7)}`);
    echoInfo(`远程提交: ${remoteCommit.substring(0, 7)}`);
    exit(1);
  }

  echoSuccess("代码已是最新版本");

  // 3. 选择升级的版本
  echoInfo(
    `请选择要升级的npm版本
      1). 修订号：向下的版本问题修复，bug fix 版本
      2). 次版本号：向下兼容的功能性新增或弃用，feature 版本，每次次版本号递增时，修订号必须归零
      3). 主版本号：做了不兼容旧版本的API修改，大版本修改，主版本号递增时，次版本号和修订号必须归零
    `
  );
  const inputVersion = await promptUser(
    chalk.cyan("输入1/2/3后按回车(不输入默认修订号): ")
  );

  const packageFile = await getPackage();
  // 获取新版本
  const version = packageFile.version;
  const newVersion = getNewVersion(version, inputVersion);
  packageFile.version = newVersion;

  // 4. 更新 package.json
  await setPackage(packageFile);
  echoSuccess(`正在由版本${version}升级到${newVersion}`);

  // 5. 构建验证（确保代码能正常构建）
  echoInfo("正在构建项目...");
  if (exec("npm run build").code !== 0) {
    echoExit("Error: 本地npm run build打包失败，请修复后再发布");
    // 回滚版本号
    packageFile.version = version;
    await setPackage(packageFile);
    exit(1);
  }
  echoSuccess("构建成功");

  // 6. 只提交 package.json 的版本改动
  if (exec("git add package.json").code !== 0) {
    echoExit("Error: Git add package.json failed");
    exit(1);
  }

  if (
    exec(`git commit --no-verify -m 'chore: upgrade to ${newVersion}'`).code !==
    0
  ) {
    echoExit("Error: Git commit failed");
    exit(1);
  }

  // 7. 创建 tag
  const tagName = `v${newVersion}`;
  echoInfo(`正在创建 tag: ${tagName}`);
  if (exec(`git tag ${tagName}`).code !== 0) {
    echoExit("Error: Git tag failed");
    exit(1);
  }

  // 8. 推送代码和 tag
  echoInfo("正在推送代码...");
  if (exec("git push origin master").code !== 0) {
    echoExit("Error: Git push failed");
    exit(1);
  }

  echoInfo(`正在推送 tag: ${tagName}`);
  if (exec(`git push origin ${tagName}`).code !== 0) {
    echoExit("Error: Git push tag failed");
    exit(1);
  }

  echoSuccess(`版本升级成功！tag ${tagName} 已创建并推送`);
  echoInfo("GitHub Actions 将自动触发构建和发布流程");
  exit();
}

// 执行主函数
main().catch((error) => {
  echoExit(`Error: ${error.message}`);
  exit(1);
});

function echoSuccess(str: string): void {
  echo(chalk.green(str));
}

function echoInfo(str: string): void {
  echo(chalk.blue(str));
}

function echoExit(str: string): void {
  echo(chalk.red(str));
}

async function getPackage(): Promise<PackageJson> {
  return new Promise((res) => {
    fs.readFile("package.json", "utf-8", (err, info) => {
      if (err) {
        echoExit(err.message);
        exit(1);
      }
      res(JSON.parse(info));
    });
  });
}

async function setPackage(packageFile: PackageJson): Promise<void> {
  return new Promise((res) => {
    fs.writeFile(
      "package.json",
      JSON.stringify(packageFile, null, "\t"),
      (err) => {
        if (err) {
          echoExit(err.message);
          exit(1);
        } else {
          res();
        }
      }
    );
  });
}

function getNewVersion(version: string, inputVersion: string): string {
  const [l, m, r] = version.split(".");
  let lNum = Number(l);
  let mNum = Number(m);
  let rNum = Number(r);

  if (inputVersion.indexOf("1") !== -1) {
    rNum++;
  } else if (inputVersion.indexOf("2") !== -1) {
    mNum++;
    rNum = 0;
  } else if (inputVersion.indexOf("3") !== -1) {
    lNum++;
    mNum = 0;
    rNum = 0;
  } else {
    rNum++;
  }
  return `${lNum}.${mNum}.${rNum}`;
}
