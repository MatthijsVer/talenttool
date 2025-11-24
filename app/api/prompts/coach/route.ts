import { NextResponse } from "next/server";

import { DEFAULT_COACH_ROLE_PROMPT } from "@/lib/agents/prompts";
import { getCoachPrompt, updateCoachPrompt } from "@/lib/data/store";

export async function GET() {
  const prompt = await getCoachPrompt();
  return NextResponse.json({
    prompt: prompt?.content ?? DEFAULT_COACH_ROLE_PROMPT,
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

    const saved = await updateCoachPrompt(promptText);

    return NextResponse.json({
      prompt: saved.content,
      updatedAt: saved.updatedAt,
      isCustom: true,
    });
  } catch (error) {
    console.error("Coach prompt API error", error);
    return NextResponse.json(
      { error: "Prompt opslaan is mislukt." },
      { status: 500 },
    );
  }
}
