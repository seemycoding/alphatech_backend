import { Request, Response, NextFunction } from 'express';
import { ConfiguratorService } from '../services/configuratorService';

export class ConfiguratorController {
  static async getOptions(req: Request, res: Response, next: NextFunction) {
    try {
      const options = await ConfiguratorService.getConfiguratorOptions();
      res.json({ success: true, data: options });
    } catch (error) {
      next(error);
    }
  }

  static async checkCompatibility(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ConfiguratorService.checkCompatibility(req.body);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }
}
