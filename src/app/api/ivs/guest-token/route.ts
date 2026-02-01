// app/api/ivs/guest-token/route.ts
import { CreateParticipantTokenCommand } from "@aws-sdk/client-ivs-realtime";
import { ivsClient } from "@/lib/ivsClient";

export async function POST(req: Request) {
    const { appointmentId } = await req.json();

    // 🔍 1. VALIDATE APPOINTMENT

    // 🔢 2. ENFORCE MAX 4 PARTICIPANTS
    // count active tokens / participants (DB or memory)

    const command = new CreateParticipantTokenCommand({
        stageArn: process.env.IVS_STAGE_ARN!,
        capabilities: ["SUBSCRIBE"], // or allow publish
        duration: 600, // 10 minutes
    });

    const res = await ivsClient.send(command);

    return Response.json({
        token: res.participantToken,
    });
}
