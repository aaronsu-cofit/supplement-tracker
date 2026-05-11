import { FastifyRequest, FastifyReply } from 'fastify';
import { BaseController } from './base.controller.js';
import { ProductsService } from '../services/products.service.js';

// Minimal controller - delegates to existing db functions for rapid migration
export class ProductsController extends BaseController {
  constructor(
    request: FastifyRequest,
    reply: FastifyReply,
    private productsService: ProductsService,
  ) {
    super(request, reply);
  }
}
