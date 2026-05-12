import { PrismaClient } from '@prisma/client';
import { getActiveModules } from '../lib/db.js';

export class ModulesService {
  constructor(private prisma: PrismaClient) {}

  async getActiveModules() {
    return getActiveModules();
  }
}
