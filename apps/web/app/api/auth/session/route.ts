import { currentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await currentUser();
    return Response.json({
      user: { id: user.id, name: user.name, email: user.email },
      workspaces: user.memberships.map((m) => ({ ...m.workspace, role: m.role })),
    });
  } catch {
    // If user is guest or database is offline, provide a default Studio Vidi workspace with 100 credits
    return Response.json({
      user: { id: 'local-creator', name: 'Studio Vidi', email: 'studio@vidi.local' },
      workspaces: [
        {
          id: 'ws_local',
          name: 'Studio Vidi',
          plan: 'agency',
          credits: 100,
          role: 'OWNER',
        },
      ],
    });
  }
}
