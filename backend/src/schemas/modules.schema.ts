export const getModulesSchema = {
  description: 'Get active modules (public endpoint)',
  tags: ['modules'],
  response: {
    200: {
      type: 'object',
      properties: {
        modules: { type: 'array', items: { type: 'object' } },
      },
    },
  },
};
