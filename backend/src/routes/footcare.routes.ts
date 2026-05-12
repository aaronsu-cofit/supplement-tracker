// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/routes/footcare.routes.ts
import { FastifyInstance } from 'fastify';
import { FootcareController } from '../controllers/footcare.controller.js';
import { asyncHandler } from '../controllers/base.controller.js';
import { container } from '../lib/container.js';
import { softAuthPreHandler } from '../middleware/authMiddleware.js';
import type { FootcareService } from '../services/footcare.service.js';
import {
  getAssessmentsSchema,
  createAssessmentSchema,
  getFootImagesSchema,
  createFootImageSchema,
  getShoeImagesSchema,
  createShoeImageSchema,
} from '../schemas/footcare.schema.js';

export async function footcareRoutes(app: FastifyInstance) {
  const footcareService = container.get<FootcareService>('footcareService');

  // Apply softAuth to all routes
  app.addHook('preHandler', softAuthPreHandler);

  app.get(
    '/assessments',
    { schema: getAssessmentsSchema },
    asyncHandler(async (request, reply) => {
      const controller = new FootcareController(request, reply, footcareService);
      return controller.getAssessments();
    }),
  );

  app.post(
    '/assessments',
    { schema: createAssessmentSchema },
    asyncHandler(async (request, reply) => {
      const controller = new FootcareController(request, reply, footcareService);
      return controller.createAssessment();
    }),
  );

  app.get(
    '/images',
    { schema: getFootImagesSchema },
    asyncHandler(async (request, reply) => {
      const controller = new FootcareController(request, reply, footcareService);
      return controller.getFootImages();
    }),
  );

  app.post(
    '/images',
    { schema: createFootImageSchema },
    asyncHandler(async (request, reply) => {
      const controller = new FootcareController(request, reply, footcareService);
      return controller.createFootImage();
    }),
  );

  app.get(
    '/shoe-images',
    { schema: getShoeImagesSchema },
    asyncHandler(async (request, reply) => {
      const controller = new FootcareController(request, reply, footcareService);
      return controller.getShoeImages();
    }),
  );

  app.post(
    '/shoe-images',
    { schema: createShoeImageSchema },
    asyncHandler(async (request, reply) => {
      const controller = new FootcareController(request, reply, footcareService);
      return controller.createShoeImage();
    }),
  );
}
