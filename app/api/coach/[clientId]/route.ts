import { NextResponse } from "next/server";
import type { UserRole } from "@prisma/client";

import { runCoachAgent } from "@/lib/agents/service";
import { auth } from "@/lib/auth";
import { getClientForUser, getSessionWindow } from "@/lib/data/store";

interface Params {
  params: Promise<{
    clientId: string;
  }>;
}

export async function GET(request: Request, { params }: Params) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 });
  }

  const { clientId } = await params;
  const userRole = session.user.role as UserRole;
  const client = await getClientForUser(clientId, session.user.id, userRole);
  if (!client) {
    return NextResponse.json({ error: "Cliënt niet gevonden." }, { status: 404 });
  }

  const history = await getSessionWindow(clientId, 50);
  if (!history) {
    return NextResponse.json({ error: "Cliënt niet gevonden." }, { status: 404 });
  }

  return NextResponse.json({ clientId, history });
}

export async function POST(request: Request, { params }: Params) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 });
  }

  const { clientId } = await params;
  const userRole = session.user.role as UserRole;
  const client = await getClientForUser(clientId, session.user.id, userRole);
  if (!client) {
    return NextResponse.json({ error: "Cliënt niet gevonden." }, { status: 404 });
  }

  try {
    const body = await request.json();
    const message = (body?.message ?? "").toString().trim();

    if (!message) {
      return NextResponse.json(
        { error: "Bericht is verplicht." },
        { status: 400 },
      );
    }

    const result = await runCoachAgent(clientId, message);

    const history = (await getSessionWindow(clientId)) ?? [];

    return NextResponse.json({
      clientId,
      reply: result.reply,
      responseId: result.responseId,
      usage: result.usage,
      history,
    });
  } catch (error) {
    console.error("Coach API error", error);
    return NextResponse.json(
      { error: "Coach is tijdelijk niet bereikbaar." },
      { status: 500 },
    );
  }
}
