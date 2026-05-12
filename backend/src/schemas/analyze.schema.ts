// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/schemas/analyze.schema.ts

export const analyzeSchema = {
  description: 'Analyze an image using AI',
  tags: ['analyze'],
  body: {
    type: 'object',
    required: ['image'],
    properties: {
      image: { type: 'string' },
      mode: {
        type: 'string',
        enum: ['label', 'checkin', 'wound', 'hallux_valgus', 'shoe_wear', 'sexual_health'],
      },
      prompt: { type: 'string' },
    },
  },
  response: {
    200: {
      type: 'object',
    },
  },
};
