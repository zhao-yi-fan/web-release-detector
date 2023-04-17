let lastSrcs; // 上次获取到的script链接

const scriptReg = /<script.*?src=["']?(?<src>[^"'\s>]+)/gm;
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
  }
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
export default function releaseInspect (options = {}) {
  const { callback, DURATION = 15000 } = options;
  setTimeout(async () => {
    const willUpdate = await needUpdate(options);
    if (willUpdate) {
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
      // TODO 不应该加到body上，应该加到一个固定的容器上
      document.body.appendChild(div);
      const btn = div.querySelector("#releaseInspectRefreshBtn");
      btn.addEventListener("click", () => {
        window.location.reload();
      });
      const closeBtn = div.querySelector("#releaseInspectCloseBtn");
      closeBtn.addEventListener("click", () => {
        div.style.transform = `translateY(-100%)`;
        setTimeout(() => {
          document.body.removeChild(div);
        }, 500);
      });
      callback();
    }
    releaseInspect(options);
  }, DURATION);
}
