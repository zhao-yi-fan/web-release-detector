let lastSrcList: string[] | undefined; // 上次获取到的script链接

// <script src=static/js/chunk-elementUI.7c48a9d2.js></script>
// <script src='static/js/chunk-elementUI.7c48a9d2.js'></script>
// <script src="static/js/chunk-elementUI.7c48a9d2.js"></script>
const scriptReg = /<script[^>]*src=["']?(?<src>[^"'\s>]+)/gm;

interface ReleaseInspectOptions {
  Vue?: any;
  router?: any;
  DURATION?: number;
  callback?: (options: ReleaseInspectOptions) => void;
  container?: HTMLElement;
  gateway?: string;
  customCreateDom?: (options: ReleaseInspectOptions) => void;
}

/**
 * 获取最新页面中的script链接
 * 以 "https://example.com/app/page" 为例
 */
async function extractNewScripts(
  options: ReleaseInspectOptions
): Promise<string[] | undefined> {
  const origin = window.location.origin; // https://example.com
  const pathname = window.location.pathname; // /app/page
  // 解析当前网站的网关，在origin后面的第一个/之前默认为网关
  let gateway = options.gateway || origin; // 默认为: https://example.com
  if (!options.gateway) {
    // 从第二个字符开始查找/的位置 因为pathname第一个字符固定是/
    const firstSlashIndex = pathname.indexOf("/", 1);
    if (firstSlashIndex > 0) {
      // https://example.com + /app/
      gateway += pathname.substring(0, firstSlashIndex) + "/";
    }
    // 如果判断有后缀名则使用当前路径 则认为不是单页面应用程序 如: http://localhost:3000/111.html
    if (pathname.indexOf(".") > 0) {
      gateway = location.href;
    }
  }
  try {
    // 获取最新的html
    const html = await fetch(gateway + "?_timestamp=" + Date.now()).then(
      (res) => res.text()
    );
    // 重置正则的lastIndex
    scriptReg.lastIndex = 0;
    const result: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = scriptReg.exec(html))) {
      if (match.groups?.src) {
        result.push(match.groups.src);
      }
    }
    /* 
    [
      "/public-vue/static/js/app-1.0.0.min.js",
      "/app-vue/static/js/manifest.40970b094d0e055c6181.js",
      "/app-vue/static/js/vendor.769c9fcad87444add951.js",
      "/app-vue/static/js/app.d8b5c099779a6bb31c19.js"
    ]
    */
    return result;
  } catch (error) {
    // 断网或者其他服务器原因导致接口获取失败
    console.warn(error);
    if (!lastSrcList) {
      // 如果是第一次，lastSrcList此时为undefined，继续赋值为undefined
      return undefined;
    } else {
      // 如果不是第一次，返回上次获取到的script链接 认为没有更新
      return lastSrcList;
    }
  }
}

// 生成页面的dom
function createRefreshDom(options: ReleaseInspectOptions = {}): void {
  const container = options.container || document.body;
  // 判断container中是否已经存在dom 如果存在则不再创建 防止当前页面检测到多次版本更新，追加了多次dom
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
  // 刷新按钮
  const btn = div.querySelector("#releaseInspectRefreshBtn");
  btn?.addEventListener("click", () => {
    window.location.reload();
  });
  // 关闭按钮
  const closeBtn = div.querySelector("#releaseInspectCloseBtn");
  closeBtn?.addEventListener("click", () => {
    div.style.transform = `translateY(-100%)`;
    setTimeout(() => {
      container.removeChild(div);
    }, 500);
  });
}

/**
 * 检查是否需要更新。
 * @param {object} options - 选项对象。
 * @returns {boolean} - 如果需要更新则返回 true，否则返回 false。
 */
async function needUpdate(options: ReleaseInspectOptions): Promise<boolean> {
  const newScripts = await extractNewScripts(options);
  if (!lastSrcList) {
    // 第一次存储的script src数组
    lastSrcList = newScripts;
    return false;
  }
  let result = false;
  // 如果两次获取到的script src数组长度不一致，则认为有更新
  if (lastSrcList.length !== newScripts?.length) {
    result = true;
  }
  // 如果上次和本次获取到的script src数组中相同索引有不一致的，则认为有更新
  if (newScripts) {
    for (let i = 0; i < lastSrcList.length; i++) {
      if (lastSrcList[i] !== newScripts[i]) {
        result = true;
        break;
      }
    }
  }
  // 将最新解析结果保存覆盖到上次存储的变量中
  lastSrcList = newScripts;
  return result;
}

/**
 * 检查路由是否匹配
 * @param {Object} Vue - Vue实例
 * @param {Object} router - 路由实例
 * @returns {boolean} - 如果有任何匹配的路由记录中的 meta 属性有 releaseInspect 设置为 false，则返回 true，否则返回 false
 */
function checkRouterMatched(Vue: any, router: any): boolean {
  // 如果 Vue 版本不是 2.x.x，直接返回 false
  if (!Vue.version.startsWith("2.")) {
    return false;
  }
  const parsedURL = new URL(location.href);
  let pathToResolve: string;

  // 使用默认值 'hash' 如果 mode 未定义
  const mode = router.mode || "hash";
  const base = router.options.base || "/";

  if (mode === "hash") {
    pathToResolve = parsedURL.hash.slice(1); // 去除 '#' 符号
  } else if (mode === "history") {
    pathToResolve = parsedURL.pathname;
    // 考虑base参数，如果pathname开始于base，去掉base部分
    if (pathToResolve.startsWith(base)) {
      pathToResolve = pathToResolve.slice(base.length);
    }
  } else {
    pathToResolve = parsedURL.hash.slice(1);
  }

  const resolvedRoute = router.resolve(pathToResolve);
  // 检查是否有任何匹配的路由记录中的 meta 属性有 releaseInspect 设置为 false
  return resolvedRoute.resolved.matched.some(
    (record: any) => record.meta && record.meta.releaseInspect === false
  );
}

/**
 * 发布检测函数
 * @param {Vue} [options.Vue] - Vue 对象
 * @param {VueRouter} [options.router] - VueRouter 对象
 * @param {number} [options.DURATION=120000] - 检测间隔时间，默认为 120 秒（单位：毫秒）
 * @param {function} [options.callback] - 检测到更新后的回调函数
 * @param {HTMLElement} [options.container=document.body] - 插入的容器，默认为 document.body
 * @param {string} [options.gateway] - 网关，默认为在 location.origin 后的第一个 "/" 之前
 * @param {function} [options.customCreateDom] - 自定义创建 DOM 的方法
 * @returns {void}
 */
export function releaseInspect(options: ReleaseInspectOptions = {}): void {
  const { callback, DURATION = 120 * 1000, Vue, router } = options;
  setTimeout(async () => {
    try {
      // 判断请求解析的结果和上次结果相比，是否需要版本更新提示
      const willUpdate = await needUpdate(options);
      if (willUpdate) {
        // 判断是否vue2版本
        if (Vue && Vue.version.startsWith("2.") && router) {
          // 检查当前是否为路由页面，如果是路由页面，且路由页面中有设置 releaseInspect 为 false 的 meta 属性，则不进行版本更新提示
          const hasFalsely = checkRouterMatched(Vue, router);
          if (hasFalsely) {
            // 如果当前路由不需要版本更新提示，则继续递归
            releaseInspect(options);
            return;
          }
        }
        // 生成自定义dom
        if (options.customCreateDom) {
          options.customCreateDom(options);
        } else {
          // 版本更新提示
          createRefreshDom(options);
        }
        // 执行回调函数
        callback && callback(options);
      }
      // 递归
      releaseInspect(options);
    } catch (error) {
      console.error("Error in releaseInspect function:", error);
    }
  }, DURATION);
}
