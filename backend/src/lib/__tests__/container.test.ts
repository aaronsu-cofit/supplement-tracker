// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/lib/__tests__/container.test.ts
/**
 * DI Container 單元測試
 *
 * 測試項目：
 * - 服務註冊和獲取
 * - 單例模式驗證
 * - 錯誤情況（未註冊的服務）
 * - 多次獲取相同服務返回相同實例
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Container } from '../container.js';

describe('DI Container', () => {
  let container: Container;

  beforeEach(() => {
    // 為每個測試創建新的容器實例
    container = new Container();
  });

  describe('服務註冊', () => {
    it('應該成功註冊服務', () => {
      const factory = () => ({ name: 'TestService' });
      container.register('testService', factory, true);

      expect(container.has('testService')).toBe(true);
    });

    it('應該允許註冊多個服務', () => {
      container.register('service1', () => ({ id: 1 }), true);
      container.register('service2', () => ({ id: 2 }), true);
      container.register('service3', () => ({ id: 3 }), true);

      expect(container.has('service1')).toBe(true);
      expect(container.has('service2')).toBe(true);
      expect(container.has('service3')).toBe(true);
    });

    it('應該允許覆蓋已註冊的服務', () => {
      container.register('testService', () => ({ version: 1 }), true);
      const service1 = container.get('testService');

      container.register('testService', () => ({ version: 2 }), true);
      const service2 = container.get('testService');

      expect(service1.version).toBe(1);
      expect(service2.version).toBe(2);
    });
  });

  describe('服務獲取', () => {
    it('應該成功獲取已註冊的服務', () => {
      const factory = () => ({ name: 'TestService' });
      container.register('testService', factory, true);

      const service = container.get('testService');
      expect(service).toEqual({ name: 'TestService' });
    });

    it('應該在獲取未註冊的服務時拋出錯誤', () => {
      expect(() => {
        container.get('nonExistentService');
      }).toThrow('Service "nonExistentService" is not registered');
    });

    it('應該支持泛型類型', () => {
      interface TestService {
        id: number;
        name: string;
      }

      container.register<TestService>(
        'testService',
        () => ({ id: 1, name: 'Test' }),
        true,
      );

      const service = container.get<TestService>('testService');
      expect(service.id).toBe(1);
      expect(service.name).toBe('Test');
    });
  });

  describe('單例模式', () => {
    it('應該為單例服務返回相同實例', () => {
      container.register('singletonService', () => ({ counter: 0 }), true);

      const instance1 = container.get('singletonService');
      const instance2 = container.get('singletonService');

      // 修改第一個實例
      instance1.counter = 42;

      // 第二個實例應該反映相同的變化
      expect(instance2.counter).toBe(42);
      expect(instance1).toBe(instance2);
    });

    it('應該為非單例服務返回不同實例', () => {
      container.register('transientService', () => ({ counter: 0 }), false);

      const instance1 = container.get('transientService');
      const instance2 = container.get('transientService');

      // 修改第一個實例
      instance1.counter = 42;

      // 第二個實例不應該受影響
      expect(instance2.counter).toBe(0);
      expect(instance1).not.toBe(instance2);
    });

    it('應該在多次調用時返回相同的單例實例', () => {
      let creationCount = 0;
      container.register(
        'countedService',
        () => {
          creationCount++;
          return { id: creationCount };
        },
        true,
      );

      const instance1 = container.get('countedService');
      const instance2 = container.get('countedService');
      const instance3 = container.get('countedService');

      // 工廠函數應該只被調用一次
      expect(creationCount).toBe(1);
      expect(instance1).toBe(instance2);
      expect(instance2).toBe(instance3);
      expect(instance1.id).toBe(1);
    });
  });

  describe('服務檢查', () => {
    it('has() 應該正確報告服務是否已註冊', () => {
      expect(container.has('testService')).toBe(false);

      container.register('testService', () => ({}), true);

      expect(container.has('testService')).toBe(true);
    });
  });

  describe('清除服務', () => {
    it('clear() 應該移除所有已註冊的服務', () => {
      container.register('service1', () => ({ id: 1 }), true);
      container.register('service2', () => ({ id: 2 }), true);

      expect(container.has('service1')).toBe(true);
      expect(container.has('service2')).toBe(true);

      container.clear();

      expect(container.has('service1')).toBe(false);
      expect(container.has('service2')).toBe(false);
    });

    it('clear() 後應該能重新註冊服務', () => {
      container.register('testService', () => ({ version: 1 }), true);
      container.clear();

      container.register('testService', () => ({ version: 2 }), true);
      const service = container.get('testService');

      expect(service.version).toBe(2);
    });
  });

  describe('默認參數', () => {
    it('應該默認將服務註冊為單例', () => {
      container.register('defaultService', () => ({ counter: 0 }));

      const instance1 = container.get('defaultService');
      const instance2 = container.get('defaultService');

      instance1.counter = 99;

      // 應該返回相同實例（單例）
      expect(instance2.counter).toBe(99);
      expect(instance1).toBe(instance2);
    });
  });

  describe('實際使用場景', () => {
    it('應該能模擬真實的服務依賴', () => {
      // 模擬 AuthService
      class MockAuthService {
        login(email: string, password: string) {
          return { token: 'mock-token', user: { email } };
        }
      }

      // 註冊服務
      container.register('authService', () => new MockAuthService(), true);

      // 獲取並使用服務
      const authService = container.get<MockAuthService>('authService');
      const result = authService.login('test@example.com', 'password');

      expect(result.token).toBe('mock-token');
      expect(result.user.email).toBe('test@example.com');
    });

    it('應該支持多個服務實例的協作', () => {
      // 註冊多個服務
      container.register('configService', () => ({ apiUrl: 'http://api.example.com' }), true);
      container.register('loggerService', () => ({ log: (msg: string) => msg }), true);
      container.register(
        'httpService',
        () => {
          const config = container.get<{ apiUrl: string }>('configService');
          return {
            get: (path: string) => `GET ${config.apiUrl}${path}`,
          };
        },
        true,
      );

      // 獲取服務
      const httpService = container.get<{ get: (path: string) => string }>('httpService');
      const result = httpService.get('/users');

      expect(result).toBe('GET http://api.example.com/users');
    });
  });
});
