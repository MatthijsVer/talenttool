import { NextResponse } from "next/server";

import { DEFAULT_OVERSEER_ROLE_PROMPT } from "@/lib/agents/prompts";
import { getOverseerPrompt, updateOverseerPrompt } from "@/lib/data/store";

export async function GET() {
  const prompt = await getOverseerPrompt();
  return NextResponse.json({
    prompt: prompt?.content ?? DEFAULT_OVERSEER_ROLE_PROMPT,
    updatedAt: prompt?.updatedAt ?? null,
    isCustom: Boolean(prompt),
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const promptText = (body?.prompt ?? "").toString().trim();

    if (!promptText) {
      return NextResponse.json(
        { error: "Prompt mag niet leeg zijn." },
        { status: 400 },
      );
    }

    const saved = await updateOverseerPrompt(promptText);

    return NextResponse.json({
      prompt: saved.content,
      updatedAt: saved.updatedAt,
      isCustom: true,
    });
  } catch (error) {
    console.error("Overseer prompt API error", error);
    return NextResponse.json(
      { error: "Prompt opslaan is mislukt." },
      { status: 500 },
    );
  }
}
