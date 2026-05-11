// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/lib/container.ts
/**
 * Dependency Injection (DI) Container
 *
 * 責任：
 * - 註冊服務和它們的工廠函數
 * - 管理服務實例（單例模式）
 * - 解決服務的依賴關係
 * - 提供統一的服務訪問接口
 */

interface ServiceFactory<T = any> {
  (): T;
}

interface ServiceDefinition {
  factory: ServiceFactory;
  singleton: boolean;
  instance?: any;
}

export class Container {
  private services: Map<string, ServiceDefinition> = new Map();

  /**
   * 註冊服務
   * @param name 服務名稱
   * @param factory 服務工廠函數
   * @param singleton 是否為單例（默認：true）
   */
  register<T>(
    name: string,
    factory: ServiceFactory<T>,
    singleton: boolean = true,
  ): void {
    this.services.set(name, { factory, singleton });
  }

  /**
   * 獲取服務實例
   * @param name 服務名稱
   * @returns 服務實例
   */
  get<T = any>(name: string): T {
    const definition = this.services.get(name);

    if (!definition) {
      throw new Error(`Service "${name}" is not registered`);
    }

    // 如果是單例且已有實例，返回緩存的實例
    if (definition.singleton && definition.instance) {
      return definition.instance;
    }

    // 創建新實例
    const instance = definition.factory();

    // 如果是單例，緩存實例
    if (definition.singleton) {
      definition.instance = instance;
    }

    return instance;
  }

  /**
   * 檢查服務是否已註冊
   */
  has(name: string): boolean {
    return this.services.has(name);
  }

  /**
   * 清除所有服務（用於測試）
   */
  clear(): void {
    this.services.clear();
  }
}

// 創建全局容器實例
export const container = new Container();
