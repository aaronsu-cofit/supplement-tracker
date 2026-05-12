// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/schemas/footcare.schema.ts

export const getAssessmentsSchema = {
  description: 'Get foot assessments for the authenticated user',
  tags: ['footcare'],
  response: {
    200: {
      type: 'array',
      items: { type: 'object' },
    },
  },
};

export const createAssessmentSchema = {
  description: 'Create a new foot assessment',
  tags: ['footcare'],
  body: {
    type: 'object',
  },
  response: {
    201: {
      type: 'object',
    },
  },
};

export const getFootImagesSchema = {
  description: 'Get foot images for the authenticated user',
  tags: ['footcare'],
  response: {
    200: {
      type: 'array',
      items: { type: 'object' },
    },
  },
};

export const createFootImageSchema = {
  description: 'Create a new foot image',
  tags: ['footcare'],
  body: {
    type: 'object',
  },
  response: {
    201: {
      type: 'object',
    },
  },
};

export const getShoeImagesSchema = {
  description: 'Get shoe images for the authenticated user',
  tags: ['footcare'],
  response: {
    200: {
      type: 'array',
      items: { type: 'object' },
    },
  },
};

export const createShoeImageSchema = {
  description: 'Create a new shoe image',
  tags: ['footcare'],
  body: {
    type: 'object',
  },
  response: {
    201: {
      type: 'object',
    },
  },
};
