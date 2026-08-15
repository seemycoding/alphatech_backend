import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';

const router = Router();

router.post('/', async (req: Request, res: Response, NextFunction) => {
  try {
    const { name, email, phone, subject, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'Name, email, and message are required.' });
    }

    const savedMessage = await prisma.contactMessage.create({
      data: {
        name: String(name).trim(),
        email: String(email).trim().toLowerCase(),
        phone: phone ? String(phone).trim() : null,
        subject: subject ? String(subject).trim() : 'General Inquiry',
        message: String(message).trim()
      }
    });

    console.log(`📩 [CONTACT FORM] Saved inquiry #${savedMessage.id} from ${name} (${email}): ${subject}`);

    res.json({
      success: true,
      data: savedMessage,
      message: 'Thank you! Your message has been received. Our hardware specialists will respond within 2 hours.'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to record contact message' });
  }
});

export default router;
