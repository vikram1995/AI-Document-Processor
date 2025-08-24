import { NextRequest, NextResponse } from "next/server";
import { processDocumentAction } from "@/app/actions";

export async function POST(req: NextRequest) {
  try {
    const fileData = await req.json();

    if (
      !fileData.id ||
      !fileData.fileName ||
      !fileData.filePath ||
      !fileData.type
    ) {
      return NextResponse.json(
        { error: "Missing required file data" },
        { status: 400 }
      );
    }

    const result = await processDocumentAction(fileData);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Processing API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Processing failed" },
      { status: 500 }
    );
  }
}
