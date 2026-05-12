export const sendNotificationSchema = {
  description: 'Send a notification',
  tags: ['notify'],
  body: {
    type: 'object',
    required: ['type'],
    properties: {
      type: { type: 'string' },
    },
  },
  response: {
    200: { type: 'object' },
  },
};
