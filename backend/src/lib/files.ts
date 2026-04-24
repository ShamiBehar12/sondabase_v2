import fs from "node:fs/promises";
import path from "node:path";
import { env } from "../env.js";

export function bucketDir(bucket: string) {
  return path.join(env.uploadDir, bucket);
}

export async function ensureBucket(bucket: string) {
  await fs.mkdir(bucketDir(bucket), { recursive: true });
}

export function bucketFilePath(bucket: string, relativePath: string) {
  return path.join(bucketDir(bucket), relativePath);
}

export async function fileExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
