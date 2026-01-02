import { S3Client } from "@aws-sdk/client-s3";

if (!process.env.AWS_ACCESS_KEY_ID) {
  throw new Error("Missing AWS credentials");
}

export const s3 = new S3Client({
  region: "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});
