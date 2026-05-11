export const getCheckInsSchema = {
  description: 'Get check-ins',
  tags: ['checkins'],
  querystring: {
    type: 'object',
    properties: {
      date: { type: 'string' },
      startDate: { type: 'string' },
      endDate: { type: 'string' },
      type: { type: 'string', enum: ['streak', 'history'] },
    },
  },
  response: {
    200: { type: 'object' },
  },
};

export const createCheckInSchema = {
  description: 'Create a check-in',
  tags: ['checkins'],
  body: {
    type: 'object',
    required: ['supplementId'],
    properties: {
      supplementId: { type: 'number' },
    },
  },
  response: {
    201: { type: 'object' },
  },
};

export const removeCheckInSchema = {
  description: 'Remove a check-in',
  tags: ['checkins'],
  body: {
    type: 'object',
    properties: {
      supplementId: { type: 'number' },
      date: { type: 'string' },
    },
  },
  response: {
    200: { type: 'object' },
  },
};
