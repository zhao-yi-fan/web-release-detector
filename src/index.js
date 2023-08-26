let lastSrcs; // 上次获取到的script链接

// <script src=static/js/chunk-elementUI.7c48a9d2.js></script>
// <script src='static/js/chunk-elementUI.7c48a9d2.js'></script>
// <script src="static/js/chunk-elementUI.7c48a9d2.js"></script>
const scriptReg = /<script[^>]*src=["']?(?<src>[^"'\s>]+)/gm;
/**
 * 获取最新页面中的script链接
 */
async function extractNewScripts (options) {
  const origin = window.location.origin;
  const pathname = window.location.pathname;
  // 解析当前网站的网关，在origin后面的第一个/之前默认为网关
  let gateway = options.gateway || origin;
  if (!options.gateway) {
    const firstSlashIndex = pathname.indexOf("/", 1);
    if (firstSlashIndex > 0) {
      gateway += pathname.substring(0, firstSlashIndex) + '/';
    }
    // http://localhost:3000/111.html 如果判断有后缀名则使用当前路径
    if (pathname.indexOf(".") > 0) {
      gateway = location.href;
    }
  }
  try {
    // 获取最新的html
    const html = await fetch(gateway + "?_timestamp=" + Date.now()).then((res) =>
      res.text()
    );
    scriptReg.lastIndex = 0;
    const result = [];
    let match;
    while ((match = scriptReg.exec(html))) {
      result.push(match.groups.src);
    }
    return result;
  } catch (error) {
    console.warn(error);
    if (!lastSrcs) { // 如果是第一次，lastSrcs此时为undefined，继续赋值为undefined
      return undefined
    } else { // 如果不是第一次，返回上次获取到的script链接 认为没有更新
      return lastSrcs
    }
  }
}
// 生成页面的dom
function createRefreshDom (options = {}) {
  const container = options.container || document.body;
  // 判断container中是否已经存在dom 如果存在则不再创建
  if (container.querySelector("#releaseInspectRefreshBtn")) {
    return;
  }

  const div = document.createElement("div");
  div.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 50px;
    background-color: #fff;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: row;
    transition: transform 0.5s ease-in-out;
    box-shadow: 1px 1px 7px #ccc;
  `;
  div.innerHTML = `
    <div style="
      font-size: 14px;
      margin-right: 10px;
      color: #333;
    ">检测到新版本</div>
    <div style="
      font-size: 14px;
      margin-right: 10px;
      color: #333;
    ">请点击刷新按钮</div>
    <div style="
      width: 40px;
      height: 25px;
      border-radius: 5px;
      background-color: #1989fa;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-size: 14px;
      cursor: pointer;
    " id="releaseInspectRefreshBtn">刷新</div>
    <div style="
      margin-left: 5px;
      width: 40px;
      height: 25px;
      border-radius: 5px;
      background-color: #1989fa;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-size: 14px;
      cursor: pointer;
    " id="releaseInspectCloseBtn">关闭</div>
  `;
  container.appendChild(div);
  const btn = div.querySelector("#releaseInspectRefreshBtn");
  btn.addEventListener("click", () => {
    window.location.reload();
  });
  const closeBtn = div.querySelector("#releaseInspectCloseBtn");
  closeBtn.addEventListener("click", () => {
    div.style.transform = `translateY(-100%)`;
    setTimeout(() => {
      container.removeChild(div);
    }, 500);
  });
}

async function needUpdate (options) {
  const newScripts = await extractNewScripts(options);
  if (!lastSrcs) {
    lastSrcs = newScripts;
    return false;
  }
  let result = false;
  if (lastSrcs.length !== newScripts.length) {
    result = true;
  }
  for (let i = 0; i < lastSrcs.length; i++) {
    if (lastSrcs[i] !== newScripts[i]) {
      result = true;
      break;
    }
  }
  lastSrcs = newScripts;
  return result;
}

function checkRouterMatched (Vue, router) {
  // 如果 Vue 版本不是 2.x.x，直接返回 false
  if (!Vue.version.startsWith('2.')) {
    return false;
  }
  const parsedURL = new URL(location.href);
  let pathToResolve;

  // 使用默认值 'hash' 如果 mode 未定义
  const mode = router.mode || 'hash';
  const base = router.options.base || '/';

  if (mode === 'hash') {
    pathToResolve = parsedURL.hash.slice(1); // 去除 '#' 符号
  } else if (mode === 'history') {
    pathToResolve = parsedURL.pathname;
    // 考虑base参数，如果pathname开始于base，去掉base部分
    if (pathToResolve.startsWith(base)) {
      pathToResolve = pathToResolve.slice(base.length);
    }
  }

  const resolvedRoute = router.resolve(pathToResolve);
  // 检查是否有任何匹配的路由记录中的 meta 属性有 releaseInspect 设置为 false
  return resolvedRoute.resolved.matched.some(record => record.meta && record.meta.releaseInspect === false);
}

/**
 * 
 * @param {*} options  {
 * DURATION: 120 * 1000, // 检测间隔时间
 * callback: () => {}, // 检测到更新后的回调
 * container: document.body, // 插入的容器
 * gateway: 'http://localhost:8080/product/' // 网关
 * customCreateDom: (options) => {} // 自定义创建dom的方法
 * }
 */
export function releaseInspect (options = {}) {
  const { callback, DURATION = 120 * 1000, Vue, router } = options;
  setTimeout(async () => {
    const willUpdate = await needUpdate(options);
    if (willUpdate) {
      // 判断是否vue2版本
      if (Vue.version && Vue.version.startsWith('2.') && router) {
        const hasFasly = checkRouterMatched(Vue, router)
        if (hasFasly) {
          releaseInspect(options);
          return
        }
      }
      // 生成自定义dom
      if (options.customCreateDom) {
        options.customCreateDom(options);
      } else {
        createRefreshDom(options);
      }
      callback && callback(options);
    }
    releaseInspect(options);
  }, DURATION);
}
