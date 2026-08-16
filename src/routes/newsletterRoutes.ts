import { Router, Request, Response } from 'express';
import { prisma } from '../config/db';

const router = Router();

router.post('/subscribe', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    const subscription = await prisma.newsletterSubscription.upsert({
      where: { email: cleanEmail },
      update: { isActive: true },
      create: { email: cleanEmail }
    });

    console.log(`📬 [NEWSLETTER] New subscriber recorded: ${cleanEmail}`);

    res.json({
      success: true,
      data: subscription,
      message: 'Thank you for subscribing to AlphaaTechh Newsletter!'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error?.message || 'Failed to process subscription' });
  }
});

export default router;
