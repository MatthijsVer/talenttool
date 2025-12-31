import { NextResponse } from "next/server";
import { AgentKind } from "@prisma/client";

import { DEFAULT_COACH_ROLE_PROMPT, DEFAULT_OVERSEER_ROLE_PROMPT } from "@/lib/agents/prompts";
import { refinePromptWithFeedback } from "@/lib/agents/prompt-refiner";
import { auth } from "@/lib/auth";
import {
  getCoachPrompt,
  getOverseerPrompt,
  listAgentFeedback,
  updateCoachPrompt,
  updateOverseerPrompt,
} from "@/lib/data/store";

function normalizeAgentType(input: unknown): AgentKind | null {
  if (input === "COACH" || input === AgentKind.COACH) {
    return AgentKind.COACH;
  }
  if (input === "OVERSEER" || input === AgentKind.OVERSEER) {
    return AgentKind.OVERSEER;
  }
  return null;
}

async function getBasePrompt(agentType: AgentKind) {
  if (agentType === AgentKind.COACH) {
    const record = await getCoachPrompt();
    return record?.content ?? DEFAULT_COACH_ROLE_PROMPT;
  }
  const record = await getOverseerPrompt();
  return record?.content ?? DEFAULT_OVERSEER_ROLE_PROMPT;
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  const agentType = normalizeAgentType((payload as { agentType?: string })?.agentType);

  if (!agentType) {
    return NextResponse.json({ error: "Agenttype ontbreekt." }, { status: 400 });
  }

  const feedback = await listAgentFeedback(agentType, 10);
  if (!feedback.length) {
    return NextResponse.json(
      { error: "Er is nog geen feedback beschikbaar voor dit agenttype." },
      { status: 400 },
    );
  }

  const basePrompt = await getBasePrompt(agentType);

  try {
    const refined = await refinePromptWithFeedback({
      agentType,
      basePrompt,
      feedback: feedback.map((item) => ({
        id: item.id,
        feedback: item.feedback,
        messageContent: item.messageContent,
      })),
    });

    const saved =
      agentType === AgentKind.COACH
        ? await updateCoachPrompt(refined)
        : await updateOverseerPrompt(refined);

    return NextResponse.json({
      agentType,
      prompt: saved.content,
      updatedAt: saved.updatedAt,
      usedFeedback: feedback,
    });
  } catch (error) {
    console.error("Prompt refinement failed", error);
    return NextResponse.json(
      { error: "Prompt herschrijven is mislukt." },
      { status: 500 },
    );
  }
}
