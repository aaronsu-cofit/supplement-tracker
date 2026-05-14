// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/lib/initializeContainer.ts
/**
 * DI 容器初始化
 * 在應用啟動時註冊所有服務
 */

import { Container } from './container.js';
import { serviceFactory } from './serviceFactory.js';

/**
 * 初始化 DI 容器，註冊所有服務為單例
 * @param container DI 容器實例
 */
export function initializeContainer(container: Container): void {
  // 註冊所有服務為單例
  container.register('authService', serviceFactory.authService, true);
  container.register('supplementsService', serviceFactory.supplementsService, true);
  container.register('woundsService', serviceFactory.woundsService, true);
  container.register('hqService', serviceFactory.hqService, true);
  container.register('intimacyService', serviceFactory.intimacyService, true);
  container.register('schedulerService', serviceFactory.schedulerService, true);
  container.register('aiService', serviceFactory.aiService, true);
  container.register('wizardService', serviceFactory.wizardService, true);
  container.register('footcareService', serviceFactory.footcareService, true);
  container.register('analyzeService', serviceFactory.analyzeService, true);
  container.register('checkinsService', serviceFactory.checkinsService, true);
  container.register('notifyService', serviceFactory.notifyService, true);
  container.register('modulesService', serviceFactory.modulesService, true);
  container.register('richmenuService', serviceFactory.richmenuService, true);
  container.register('lineoaService', serviceFactory.lineoaService, true);
  container.register('meService', serviceFactory.meService, true);
  container.register('productsService', serviceFactory.productsService, true);
  container.register('questionnaireService', serviceFactory.questionnaireService, true);
  container.register('womenHealingService', serviceFactory.womenHealingService, true);
}
