import { NextResponse } from "next/server";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { s3 } from "@/lib/s3/s3";

export async function GET() {
  const result = await s3.send(
    new ListObjectsV2Command({
      Bucket: process.env.AWS_S3_BUCKET!,
      MaxKeys: 1,
    })
  );

  return NextResponse.json({
    ok: true,
    keys: result.Contents?.map(o => o.Key) ?? [],
  });
}
