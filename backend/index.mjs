import { extractHandler } from './handler.js';

export const handler = async (event) => {
  return await extractHandler(event);
};
