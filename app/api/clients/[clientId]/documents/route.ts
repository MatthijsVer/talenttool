import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { transcribeAudio } from "@/lib/ai/openai";
import {
  createClientDocument,
  getClient,
  getClientDocuments,
} from "@/lib/data/store";

interface Params {
  params: Promise<{
    clientId: string;
  }>;
}

export async function GET(_: Request, { params }: Params) {
  const { clientId } = await params;

  const client = await getClient(clientId);
  if (!client) {
    return NextResponse.json({ error: "Cliënt niet gevonden." }, { status: 404 });
  }

  const documents = await getClientDocuments(clientId);
  return NextResponse.json({ documents });
}

export async function POST(request: Request, { params }: Params) {
  const { clientId } = await params;
  const client = await getClient(clientId);
  if (!client) {
    return NextResponse.json({ error: "Cliënt niet gevonden." }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Bestand is verplicht." }, { status: 400 });
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "Bestand is leeg." }, { status: 400 });
  }

  const uploadDir = path.join(process.cwd(), "uploads", clientId);
  await mkdir(uploadDir, { recursive: true });

  const storedName = `${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
  const filePath = path.join(uploadDir, storedName);

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await writeFile(filePath, buffer);

  const isAudio = isAudioFile(file.name, file.type);
  let content: string | undefined;
  let audioDuration: number | undefined;

  if (isAudio) {
    try {
      const transcription = await transcribeAudio(filePath, file.type);
      content = transcription.text?.trim() || undefined;
      audioDuration = transcription.duration;
    } catch (error) {
      console.error("Audio transcription failed", error);
    }
  } else if (shouldStoreContent(file.type, file.name)) {
    content = buffer.toString("utf-8").slice(0, 8000);
  }

  await createClientDocument({
    clientId,
    originalName: file.name,
    storedName,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    content,
    kind: isAudio ? "AUDIO" : "TEXT",
    audioDuration,
  });

  const documents = await getClientDocuments(clientId);
  return NextResponse.json({ documents });
}

function shouldStoreContent(mimeType: string, fileName: string) {
  if (mimeType?.startsWith("text/") || mimeType === "application/json") {
    return true;
  }
  return /\.(md|txt|json|csv)$/i.test(fileName);
}

function isAudioFile(fileName: string, mimeType?: string) {
  if (mimeType?.startsWith("audio/")) {
    return true;
  }
  return /\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(fileName);
}
