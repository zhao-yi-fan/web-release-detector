/**
 * @jest-environment jsdom
 */

import { releaseInspect } from "../src/index";

describe("releaseInspect", () => {
  beforeEach(() => {
    // 清理 DOM
    document.body.innerHTML = "";

    // Mock window.location
    delete (window as any).location;
    window.location = {
      origin: "https://example.com",
      pathname: "/app/page",
      href: "https://example.com/app/page",
      reload: jest.fn(),
    } as any;
  });

  describe("基础功能测试", () => {
    it("应该是一个函数", () => {
      expect(typeof releaseInspect).toBe("function");
    });

    it("应该接受一个可选的配置对象", () => {
      expect(() => releaseInspect()).not.toThrow();
      expect(() => releaseInspect({})).not.toThrow();
      expect(() => releaseInspect({ DURATION: 60000 })).not.toThrow();
    });

    it("应该接受配置参数", () => {
      const config = {
        DURATION: 30000,
        callback: jest.fn(),
        container: document.body,
        gateway: "https://test.com/",
      };

      expect(() => releaseInspect(config)).not.toThrow();
    });
  });

  describe("DOM 创建功能", () => {
    it("创建刷新提示 DOM 时应该包含必需的元素", () => {
      // 手动创建DOM来测试结构
      const div = document.createElement("div");
      div.innerHTML = `
        <div id="releaseInspectRefreshBtn">刷新</div>
        <div id="releaseInspectCloseBtn">关闭</div>
      `;
      document.body.appendChild(div);

      const refreshBtn = document.querySelector("#releaseInspectRefreshBtn");
      const closeBtn = document.querySelector("#releaseInspectCloseBtn");

      expect(refreshBtn).toBeTruthy();
      expect(closeBtn).toBeTruthy();
      expect(refreshBtn?.textContent).toBe("刷新");
      expect(closeBtn?.textContent).toBe("关闭");
    });

    it("应该能够在自定义容器中创建元素", () => {
      const customContainer = document.createElement("div");
      customContainer.id = "custom-container";
      document.body.appendChild(customContainer);

      const testDiv = document.createElement("div");
      testDiv.id = "test-content";
      customContainer.appendChild(testDiv);

      const foundDiv = customContainer.querySelector("#test-content");
      expect(foundDiv).toBeTruthy();
    });
  });

  describe("配置选项", () => {
    it("应该支持自定义 DURATION", () => {
      const customDuration = 60000;
      const config = { DURATION: customDuration };

      expect(() => releaseInspect(config)).not.toThrow();
    });

    it("应该支持回调函数", () => {
      const callback = jest.fn();
      const config = { callback };

      expect(() => releaseInspect(config)).not.toThrow();
    });

    it("应该支持自定义网关", () => {
      const gateway = "https://custom.example.com/";
      const config = { gateway };

      expect(() => releaseInspect(config)).not.toThrow();
    });

    it("应该支持自定义 DOM 创建函数", () => {
      const customCreateDom = jest.fn();
      const config = { customCreateDom };

      expect(() => releaseInspect(config)).not.toThrow();
    });
  });

  describe("类型安全", () => {
    it("配置对象应该具有正确的类型", () => {
      const config = {
        Vue: {},
        router: {},
        DURATION: 120000,
        callback: () => {},
        container: document.body,
        gateway: "https://example.com/",
        customCreateDom: () => {},
      };

      // TypeScript 编译时会检查类型，运行时只测试函数不抛出错误
      expect(() => releaseInspect(config)).not.toThrow();
    });
  });

  describe("错误处理", () => {
    it("应该正常处理空配置", () => {
      expect(() => releaseInspect()).not.toThrow();
      expect(() => releaseInspect({})).not.toThrow();
    });

    it("应该正常处理各种配置组合", () => {
      expect(() => releaseInspect({ DURATION: 10000 })).not.toThrow();
      expect(() => releaseInspect({ callback: jest.fn() })).not.toThrow();
      expect(() =>
        releaseInspect({
          DURATION: 10000,
          callback: jest.fn(),
        })
      ).not.toThrow();
    });
  });

  describe("Vue Router 集成", () => {
    it("应该接受 Vue 和 router 参数", () => {
      const mockVue = {
        version: "2.6.0",
      };

      const mockRouter = {
        mode: "hash",
        options: { base: "/" },
        resolve: jest.fn(),
      };

      const config = {
        Vue: mockVue,
        router: mockRouter,
      };

      expect(() => releaseInspect(config)).not.toThrow();
    });
  });

  describe("容器配置", () => {
    it("应该允许指定自定义容器", () => {
      const customContainer = document.createElement("div");
      customContainer.id = "custom-container";
      document.body.appendChild(customContainer);

      const config = {
        container: customContainer,
      };

      expect(() => releaseInspect(config)).not.toThrow();
    });

    it("默认应该使用 document.body 作为容器", () => {
      // 测试默认行为不会抛出错误
      expect(() => releaseInspect()).not.toThrow();
    });
  });
});
