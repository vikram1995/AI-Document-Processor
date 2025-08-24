import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { cleanupUploadsFolder } from "@/app/actions";

const UPLOAD_DIR = path.resolve("./uploads");
const MAX_FILE_SIZE = parseInt(
  process.env.NEXT_PUBLIC_MAX_FILE_SIZE || "10485760"
); // 10MB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
    }

    // Clean up old files before processing new uploads
    await cleanupUploadsFolder();

    // Ensure upload directory exists
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    const uploadResults = [];

    for (const file of files) {
      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        uploadResults.push({
          fileName: file.name,
          success: false,
          error: "File size exceeds limit (10MB)",
        });
        continue;
      }

      // Validate file type
      const allowedTypes = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
        "text/plain",
      ];

      if (!allowedTypes.includes(file.type)) {
        uploadResults.push({
          fileName: file.name,
          success: false,
          error: "Unsupported file type",
        });
        continue;
      }

      try {
        // Generate unique filename
        const fileId = uuidv4();
        const fileExtension = path.extname(file.name);
        const fileName = `${fileId}${fileExtension}`;
        const filePath = path.join(UPLOAD_DIR, fileName);

        // Save file
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(filePath, buffer);

        uploadResults.push({
          id: fileId,
          fileName: file.name,
          originalName: file.name,
          size: file.size,
          type: file.type,
          filePath: fileName,
          success: true,
          uploadedAt: new Date().toISOString(),
        });
      } catch (error) {
        uploadResults.push({
          fileName: file.name,
          success: false,
          error: "Failed to save file",
        });
      }
    }

    return NextResponse.json({
      success: true,
      files: uploadResults,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
