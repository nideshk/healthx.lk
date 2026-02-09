// lib/ivsClient.ts
import { IVSRealTimeClient } from "@aws-sdk/client-ivs-realtime";

export const ivsClient = new IVSRealTimeClient({
    region: process.env.AWS_REGION!,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID_IVS!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY_IVS!,
    },
});
