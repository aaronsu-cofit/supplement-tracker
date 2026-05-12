export const deployMainMenuSchema = {
  description: 'Deploy main rich menu',
  tags: ['richmenu'],
  consumes: ['multipart/form-data'],
  response: {
    200: { type: 'object' },
  },
};

export const deployWoundsMenuSchema = {
  description: 'Deploy wounds care rich menu',
  tags: ['richmenu'],
  consumes: ['multipart/form-data'],
  response: {
    200: { type: 'object' },
  },
};
