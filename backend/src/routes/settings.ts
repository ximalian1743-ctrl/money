import { Router } from 'express';

import { SettingsService } from '../services/settings-service.js';

export function createSettingsRouter(settingsService: SettingsService) {
  const router = Router();

  router.get('/', (_request, response) => {
    response.json(settingsService.getPublicSettings());
  });

  router.put('/', (request, response, next) => {
    try {
      response.json(settingsService.update(request.body));
    } catch (error) {
      next(error);
    }
  });

  router.post('/test-connection', async (request, response, next) => {
    try {
      response.json(await settingsService.testConnection(request.body));
    } catch (error) {
      next(error);
    }
  });

  router.post('/models', async (request, response, next) => {
    try {
      response.json({ models: await settingsService.loadModels(request.body) });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
