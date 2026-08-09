import { Router } from 'express';
import { ConfiguratorController } from '../controllers/configuratorController';

const router = Router();

router.get('/options', ConfiguratorController.getOptions);
router.post('/check', ConfiguratorController.checkCompatibility);

export default router;
