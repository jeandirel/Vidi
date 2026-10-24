import { currentUser } from '@/lib/auth';
import { errorResponse } from '@/lib/api';
export async function GET() {
  try {
    const user = await currentUser();
    return Response.json({
      user: { id: user.id, name: user.name, email: user.email },
      workspaces: user.memberships.map((m) => ({ ...m.workspace, role: m.role })),
    });
  } catch (e) {
    return errorResponse(e);
  }
}
