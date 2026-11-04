import crypto from "crypto";

export type WebxpaySignatureFailure = "missing" | "no_key" | "decrypt_failed" | "mismatch";

export type WebxpaySignatureResult =
    | { ok: true; rawPaymentData: string }
    | { ok: false; reason: WebxpaySignatureFailure };

export type SignedCallbackPayment = {
    orderId: string;
    amount: string | null;
    statusCode: string;
};

type PendingTransaction = {
    order_id: string;
    amount: unknown;
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
 * That string does not include the charged amount unless a two-decimal amount
 * segment is also present. Amount is taken only from the signed string.
 */
export function readSignedCallbackPayment(rawPaymentData: string): SignedCallbackPayment {
    const parts = rawPaymentData.trim().split("|").map((part) => part.trim());
    const amounts = parts
        .slice(1)
        .filter((part) => /^\d+\.\d{1,2}$/.test(part))
        .map((part) => normalizeMoney(part))
        .filter((part): part is string => part !== null);

    return {
        orderId: parts[0] ?? "",
        amount: amounts.length === 1 ? amounts[0] : null,
        statusCode: parts[3] ?? "",
    };
}

export function normalizeMoney(value: unknown): string | null {
    if (typeof value === "number") {
        if (!Number.isFinite(value)) return null;
        return value.toFixed(2);
    }
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
    const [whole, fraction = ""] = trimmed.split(".");
    return `${whole}.${fraction.padEnd(2, "0")}`;
}

/**
 * Failure updates require the signed order id and amount to match the pending
 * transaction. A signed approval status is not a failure.
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

    const storedAmount = normalizeMoney(pending.amount);
    if (!input.signed.amount || !storedAmount) return false;
    return input.signed.amount === storedAmount;
}
