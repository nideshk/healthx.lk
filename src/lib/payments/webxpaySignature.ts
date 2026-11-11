import crypto from "crypto";

export type WebxpaySignatureFailure = "missing" | "no_key" | "decrypt_failed" | "mismatch";

export type WebxpaySignatureResult =
    | { ok: true; rawPaymentData: string }
    | { ok: false; reason: WebxpaySignatureFailure };

export type SignedCallbackPayment = {
    orderId: string;
    statusCode: string;
};

type PendingTransaction = {
    order_id: string;
    status: string;
};

/**
 * Same check the WebXPay success callback already ran inline:
 * base64-decode `payment`, RSA-decrypt `signature` with WEBXPAY_PUBLIC_KEY
 * (PKCS#1 v1.5), and require the trimmed strings to be equal.
 */
export function verifyWebxpaySignature(input: {
    signature: string | null | undefined;
    paymentBase64: string | null | undefined;
    publicKey: string | undefined;
}): WebxpaySignatureResult {
    const signature = input.signature;
    const paymentBase64 = input.paymentBase64;

    if (!signature || !paymentBase64) {
        return { ok: false, reason: "missing" };
    }

    const rawPaymentData = Buffer.from(paymentBase64, "base64").toString("utf8");
    const publicKey = input.publicKey;

    if (!publicKey) {
        return { ok: false, reason: "no_key" };
    }

    let pemKey = publicKey.replace(/\\n/g, "\n").replace(/"/g, "").trim();

    if (!pemKey.includes("-----BEGIN PUBLIC KEY-----")) {
        pemKey = `-----BEGIN PUBLIC KEY-----\n${pemKey}\n-----END PUBLIC KEY-----`;
    }

    let decryptedSignature = "";

    try {
        const keyObject = crypto.createPublicKey({
            key: pemKey,
            format: "pem",
        });

        decryptedSignature = crypto
            .publicDecrypt(
                {
                    key: keyObject,
                    padding: crypto.constants.RSA_PKCS1_PADDING,
                },
                Buffer.from(signature, "base64")
            )
            .toString("utf8")
            .replace(/\0/g, "");
    } catch {
        return { ok: false, reason: "decrypt_failed" };
    }

    if (rawPaymentData.trim() !== decryptedSignature.trim()) {
        return { ok: false, reason: "mismatch" };
    }

    return { ok: true, rawPaymentData };
}

/**
 * Documented signed payment string (WebXPay redirect callback):
 * order_id|order_refference_number|date_time_transaction|status_code|comment|payment_gateway_used
 * The charged amount is not part of this string. Failure handling matches the
 * order id only.
 */
export function readSignedCallbackPayment(rawPaymentData: string): SignedCallbackPayment {
    const parts = rawPaymentData.trim().split("|").map((part) => part.trim());

    return {
        orderId: parts[0] ?? "",
        statusCode: parts[3] ?? "",
    };
}

/**
 * A failure update applies only to the pending transaction whose order id is
 * the signed callback order id. Amount is not compared. A signed approval
 * status is not a failure.
 */
export function pendingFailureMatchesCallback(input: {
    signed: SignedCallbackPayment;
    formOrderId: string;
    pending: PendingTransaction | null;
}): boolean {
    const pending = input.pending;
    if (!pending || pending.status !== "pending") return false;
    if (!input.signed.orderId || pending.order_id !== input.signed.orderId) return false;
    if (input.formOrderId && input.formOrderId !== input.signed.orderId) return false;
    if (input.signed.statusCode === "0" || input.signed.statusCode === "00") return false;
    return true;
}
