import { z } from 'zod';
import { checkOrigin, errorResponse, jsonBody } from '@/lib/api';
import { rateLimit } from '@/lib/rate-limit';

const contactSchema = z.object({
  name: z.string().trim().min(2, 'Le nom doit contenir au moins 2 caractères.').max(80),
  email: z.string().email('Adresse email invalide.').max(254),
  company: z.string().trim().max(100).optional().default(''),
  category: z.enum(['general', 'sales', 'support', 'partnership', 'custom_models']).default('general'),
  message: z.string().trim().min(10, 'Le message doit contenir au moins 10 caractères.').max(2000),
});

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const body = await jsonBody(request);
    const input = contactSchema.parse(body);

    await rateLimit('contact:global', 60, 3600);

    // In production, send via email provider (Postmark / Resend / SES) if configured
    if (process.env.RESEND_API_KEY) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM || 'contact@vidi.ai',
            to: process.env.CONTACT_NOTIFICATION_EMAIL || 'support@vidi.ai',
            subject: `[Vidi Contact - ${input.category}] De ${input.name} (${input.company || 'Indépendant'})`,
            text: `Nom: ${input.name}\nEmail: ${input.email}\nEntreprise: ${input.company}\nCatégorie: ${input.category}\n\nMessage:\n${input.message}`,
          }),
        });
      } catch (err) {
        console.error('Contact email dispatch failed:', err);
      }
    }

    return Response.json({
      ok: true,
      message: 'Votre message a bien été transmis. Notre équipe vous répondra dans un délai de 24 heures ouvrées.',
    });
  } catch (error) {
    return errorResponse(error);
  }
}
