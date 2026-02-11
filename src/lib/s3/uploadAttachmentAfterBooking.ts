import { authFetch } from "../authFetch";

export async function uploadAttachmentAfterBooking(
  file: File,
  appointmentId: string
) {
  // 1️⃣ Get signed upload URL
  const res = await authFetch(
    `/api/appointments/${appointmentId}/attachments/upload-url`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size, // 🔑 THIS WAS MISSING

      }),
    }
  );

  if (!res.ok) {
    throw new Error("Failed to get upload URL");
  }

  const { uploadUrl, fileKey } = await res.json();
  // 2️⃣ Upload to S3
  await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type,
    },
    body: file,
  });

  // 3️⃣ Save metadata in DB
  await authFetch(`/api/appointments/${appointmentId}/attachments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      file_key: fileKey,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
    }),
  });
}
