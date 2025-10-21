import Link from "next/link";

export default function FailurePage() {
    return (
        <main
            style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "2rem",
                background: "linear-gradient(180deg,#fff,#f8f9fb)",
            }}
        >
            <div
                style={{
                    maxWidth: 640,
                    width: "100%",
                    textAlign: "center",
                    borderRadius: 12,
                    padding: "2.5rem",
                    boxShadow: "0 6px 24px rgba(16,24,40,0.08)",
                    background: "white",
                }}
            >
                <div
                    aria-hidden
                    style={{
                        fontSize: 56,
                        lineHeight: 1,
                        marginBottom: 12,
                    }}
                >
                    ❌
                </div>
                <h1 className="text-black" style={{ margin: 0, fontSize: 28, fontWeight: 600 }}>
                    Payment Failed
                </h1>
                <p style={{ color: "#475569", marginTop: 12 }}>
                    We were unable to process your payment. No charges were made. Please
                    try again or contact support if the problem continues.
                </p>

                <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 18 }}>
                    <Link
                        href="/checkout"
                        style={{
                            display: "inline-block",
                            padding: "10px 16px",
                            borderRadius: 8,
                            background: "#111827",
                            color: "white",
                            textDecoration: "none",
                            fontWeight: 600,
                        }}
                    >
                        Try again
                    </Link>

                    <Link
                        href="/"
                        style={{
                            display: "inline-block",
                            padding: "10px 16px",
                            borderRadius: 8,
                            border: "1px solid #e6e9ee",
                            color: "#111827",
                            textDecoration: "none",
                            fontWeight: 600,
                        }}
                    >
                        Go to home
                    </Link>
                </div>

                <p style={{ color: "#94a3b8", marginTop: 16, fontSize: 13 }}>
                    Need help? <a href="mailto:support@yourdomain.com">support@yourdomain.com</a>
                </p>
            </div>
        </main>
    );
}