export async function uploadAttachmentAfterBooking(
  file: File,
  appointmentId: string
) {
  // 1️⃣ Get signed upload URL
  const res = await fetch(
    `/api/appointments/${appointmentId}/attachments/upload-url`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        fileType: file.type,
      }),
    }
  );

  if (!res.ok) {
    throw new Error("Failed to get upload URL");
  }

  const { uploadUrl, key } = await res.json();

  // 2️⃣ Upload to S3
  await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type,
    },
    body: file,
  });

  // 3️⃣ Save metadata in DB
  await fetch(`/api/appointments/${appointmentId}/attachments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      file_key: key,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
    }),
  });
}
