import { Router, Request, Response, NextFunction } from 'express';

const router = Router();

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, phone, subject, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'Name, email, and message are required.' });
    }

    console.log(`[CONTACT FORM] Message received from ${name} (${email}, Phone: ${phone || 'N/A'}): ${subject || 'General Inquiry'} - ${message}`);

    res.json({
      success: true,
      message: 'Thank you! Your message has been received. Our hardware specialists will respond within 2 hours.'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
