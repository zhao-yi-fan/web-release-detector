const fs = require('fs');
const { exec, echo, exit } = require('shelljs');
const co = require('co');
const prompt = require('co-prompt');

co(function* () {
  const CURRRENT_BRANCH = exec('git rev-parse --abbrev-ref HEAD', {
    silent: true,
  }).stdout;

  // 1. 判断分支
  if (CURRRENT_BRANCH !== 'master' && CURRRENT_BRANCH !== 'master\n') {
    echoExit('必须使用master分支，且需要有master分支发布权限');
    exit(1);
  }
  // 2. 拉取代码
  exec('git pull', { silent: true });

  // 3. 选择升级的版本
  echoInfo(
    `请选择要升级的npm版本
      1). 修订号：向下的版本问题修复，bug fix 版本
      2). 次版本号：向下兼容的功能性新增或弃用，feature 版本，每次次版本号递增时，修订号必须归零
      3). 主版本号：做了不兼容旧版本的API修改，大版本修改，主版本号递增时，次版本号和修订号必须归零
    `
  );
  const inputVersion = yield prompt(
    c('输入1/2/3后按回车(不输入默认修订号): ', 'indigo')
  );

  (async () => {
    const packageFile = await getPackage();
    // 获取新版本
    const version = packageFile.version;
    const newVersion = getNewVersion(version, inputVersion);
    packageFile.version = newVersion;
    // 4. 文件变更
    await setPackage(packageFile);
    echoSuccess(`正在由版本${version}升级到${newVersion}`);

    // 4.1 build
    if (exec('npm run build').code !== 0) {
      echoExit('Error: 本地npm run build打包失败');
      exit(1);
    }

    // 5. 私有npm升级(在此之前需要登陆私有源npm账号)
    if (exec('npm publish').code !== 0) {
      echoExit(
        'Error: publish failed,  请检查私有npm源设置，并且npm账号是否登陆'
      );
      exit(1);
    }

    // 6. 升级后，提交代码
    if (exec('git add .').code !== 0) {
      echoExit('Error: Git add failed');
      exit(1);
    }

    if (
      exec(`git commit --no-verify -m 'chore: upgrade to ${newVersion}'`)
        .code !== 0
    ) {
      echoExit('Error: Git commit failed');
      exit(1);
    }

    if (exec('git push').code !== 0) {
      echoExit('Error: Git commit failed');
      exit(1);
    }
    echoSuccess('npm版本升级成功！');

  })();
});

function c(str, color = 'white') {
  const colorEnum = {
    black: 30,
    red: 31,
    green: 32,
    yellow: 33,
    blue: 34,
    popurse: 35,
    indigo: 36,
    white: 37,
  };
  return '\033[' + colorEnum[color] + 'm ' + str + ' \033[0m';
}

function echoSuccess(str, color = 'green') {
  echo(c(str, color));
}

function echoInfo(str, color = 'blue') {
  echo(c(str, color));
}

function echoWarning(str, color = 'yellow') {
  echo(c(str, color));
}

function echoExit(str, color = 'red') {
  echo(c(str, color));
}

async function getPackage() {
  return new Promise((res, rej) => {
    fs.readFile('package.json', 'utf-8', (err, info) => {
      if (err) {
        echoExit(err);
        exit(1);
      }
      res(JSON.parse(info));
    });
  });
}

async function setPackage(packageFile) {
  return new Promise((res, rej) => {
    fs.writeFile(
      'package.json',
      JSON.stringify(packageFile, '', '\t'),
      (err) => {
        if (err) {
          echoExit(err);
          exit(1);
        } else {
          res();
        }
      }
    );
  });
}

function getNewVersion(version, inputVersion) {
  let [l, m, r] = version.split('.');
  l = Number(l);
  m = Number(m);
  r = Number(r);

  if (inputVersion.indexOf('1') !== -1) {
    r++;
  } else if (inputVersion.indexOf('2') !== -1) {
    m++;
    r = 0;
  } else if (inputVersion.indexOf('3') !== -1) {
    l++;
    m = 0;
    r = 0;
  } else {
    r++;
  }
  return `${l}.${m}.${r}`;
}
