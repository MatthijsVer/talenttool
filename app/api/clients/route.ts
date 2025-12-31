import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { createClient, getClients } from "@/lib/data/store";

export async function GET() {
  const clients = await getClients();
  return NextResponse.json({ clients });
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Ongeldig verzoek" }, { status: 400 });
  }

  const { name, focusArea, summary, goals, avatarUrl } = payload as {
    name?: string;
    focusArea?: string;
    summary?: string;
    goals?: string[];
    avatarUrl?: string;
  };

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Naam is verplicht" }, { status: 400 });
  }

  const normalizedGoals = Array.isArray(goals)
    ? goals.filter((goal) => typeof goal === "string" && goal.trim().length > 0)
    : [];

  const client = await createClient({
    name,
    focusArea: typeof focusArea === "string" ? focusArea : "",
    summary: typeof summary === "string" ? summary : "",
    goals: normalizedGoals,
    avatarUrl: typeof avatarUrl === "string" ? avatarUrl : undefined,
  });

  return NextResponse.json({ client }, { status: 201 });
}
