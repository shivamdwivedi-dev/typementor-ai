import { Router } from 'express';
import { getHeatmapData, getRecoveryReport, saveRecoveryScore, getEnduranceStats } from '../controllers/analytics.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.get('/heatmap', authenticateToken as any, getHeatmapData as any);
router.get('/recovery-report', authenticateToken as any, getRecoveryReport as any);
router.post('/recovery-score', authenticateToken as any, saveRecoveryScore as any);
router.get('/endurance', authenticateToken as any, getEnduranceStats as any);

export default router;
