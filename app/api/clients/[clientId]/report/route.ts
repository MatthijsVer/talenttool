import { NextResponse } from "next/server";
import type { UserRole } from "@prisma/client";

import { generateClientReport } from "@/lib/agents/service";
import { auth } from "@/lib/auth";
import { getClientForUser, listClientReports } from "@/lib/data/store";

interface RouteParams {
  params: Promise<{
    clientId: string;
  }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 });
  }

  const { clientId } = await params;
  if (!clientId) {
    return NextResponse.json(
      { error: "Cliënt ontbreekt." },
      { status: 400 }
    );
  }

  const client = await getClientForUser(
    clientId,
    session.user.id,
    session.user.role as UserRole
  );
  if (!client) {
    return NextResponse.json({ error: "Cliënt niet gevonden." }, { status: 404 });
  }

  const url = new URL(request.url);
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : 5;

  const reports = await listClientReports(clientId, Number.isNaN(limit) ? 5 : limit);
  return NextResponse.json({ reports });
}

export async function POST(request: Request, { params }: RouteParams) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 });
  }

  const { clientId } = await params;

  if (!clientId) {
    return NextResponse.json(
      { error: "Cliënt ontbreekt." },
      { status: 400 }
    );
  }

  const client = await getClientForUser(
    clientId,
    session.user.id,
    session.user.role as UserRole
  );
  if (!client) {
    return NextResponse.json({ error: "Cliënt niet gevonden." }, { status: 404 });
  }

  try {
    const result = await generateClientReport(clientId);
    return NextResponse.json({
      report: result.reply,
      responseId: result.responseId,
      usage: result.usage ?? null,
      reportId: result.reportId,
      createdAt: result.createdAt,
    });
  } catch (error) {
    console.error("Client report error", error);
    const message =
      error instanceof Error
        ? error.message
        : "Rapport genereren is mislukt.";
    const status = message.includes("niet gevonden") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
