import { cookies } from 'next/headers';
import { db } from '@vidi/db';
import { hashToken } from '@/lib/auth';
import { checkOrigin, errorResponse } from '@/lib/api';
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const jar = await cookies();
    const token = jar.get('vidi_session')?.value;
    if (token && process.env.DATABASE_URL)
      await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
    jar.delete('vidi_session');
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
