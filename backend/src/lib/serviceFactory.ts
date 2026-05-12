// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/lib/serviceFactory.ts
/**
 * 服務工廠函數
 * 集中創建所有服務實例
 */

import { db } from './db.js';
import { AuthService } from '../services/auth.service.js';
import { SupplementsService } from '../services/supplements.service.js';
import { WoundsService } from '../services/wounds.service.js';
import { HQService } from '../services/hq.service.js';
import { IntimacyService } from '../services/intimacy.service.js';
import { SchedulerService } from '../services/scheduler.service.js';
import { AIService } from '../services/ai.service.js';
import { WizardService } from '../services/wizard.service.js';
import { FootcareService } from '../services/footcare.service.js';
import { AnalyzeService } from '../services/analyze.service.js';
import { CheckinsService } from '../services/checkins.service.js';
import { NotifyService } from '../services/notify.service.js';
import { ModulesService } from '../services/modules.service.js';
import { RichmenuService } from '../services/richmenu.service.js';
import { LineoaService } from '../services/lineoa.service.js';
import { MeService } from '../services/me.service.js';
import { ProductsService } from '../services/products.service.js';
import { WomenHealingService } from '../services/womenHealing.service.js';

/**
 * 服務工廠映射
 * 每個服務都有對應的工廠函數，用於創建服務實例
 */
export const serviceFactory = {
  authService: () => new AuthService(db()),
  supplementsService: () => new SupplementsService(db()),
  woundsService: () => new WoundsService(db()),
  hqService: () => new HQService(db()),
  intimacyService: () => new IntimacyService(db()),
  schedulerService: () => new SchedulerService(db()),
  aiService: () => new AIService(db()),
  wizardService: () => new WizardService(db()),
  footcareService: () => new FootcareService(db()),
  analyzeService: () => new AnalyzeService(db()),
  checkinsService: () => new CheckinsService(db()),
  notifyService: () => new NotifyService(db()),
  modulesService: () => new ModulesService(db()),
  richmenuService: () => new RichmenuService(),
  lineoaService: () => new LineoaService(db()),
  meService: () => new MeService(db()),
  productsService: () => new ProductsService(db()),
  womenHealingService: () => new WomenHealingService(db()),
};

/**
 * 服務類型定義
 */
export type ServiceFactory = typeof serviceFactory;
export type ServiceName = keyof ServiceFactory;
