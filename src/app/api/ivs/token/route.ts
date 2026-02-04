// app/api/ivs/token/route.ts
import {
    CreateParticipantTokenCommand,
    ParticipantTokenCapability,
} from "@aws-sdk/client-ivs-realtime";
import { ivsClient } from "@/lib/ivsClient";
import { requireUser } from "@/lib/authGuard";

export async function POST(req: Request) {

    const { user } = await requireUser(req);


    // 🔐 1. AUTHENTICATE USER
    // validate session / JWT / Supabase auth

    // 🔍 2. VALIDATE APPOINTMENT
    // - appointment exists
    // - user belongs to appointment
    // - appointment is active

    const capabilities =
        user?.role === "admin"
            ? [ParticipantTokenCapability.SUBSCRIBE]
            : [
                ParticipantTokenCapability.PUBLISH,
                ParticipantTokenCapability.SUBSCRIBE,
            ];

    const command = new CreateParticipantTokenCommand({
        stageArn: process.env.IVS_STAGE_ARN!,
        capabilities,
        duration: 900, // 15 minutes
    });

    const res = await ivsClient.send(command);

    return Response.json({
        token: res.participantToken,
    });
}
