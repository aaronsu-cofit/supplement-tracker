import { PrismaClient } from '@prisma/client';
// This service acts as a thin wrapper - business logic stays in controller for rapid migration
export class ProductsService {
  constructor(private prisma: PrismaClient) {}
}
