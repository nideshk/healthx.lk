import { authFetch } from "@/lib/authFetch";
import { Star, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

export function ReviewModal({ appointment, onClose }: any) {
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState("");
    const [loading, setLoading] = useState(false);

    // Prevent background scroll
    useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "";
        };
    }, []);

    async function submitReview() {
        if (!rating) return alert("Please select a rating");

        setLoading(true);

        const res = await authFetch(
            `http://localhost:3000/api/appointments/${appointment.appointment_id}/review`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rating, comment }),
            }
        );

        setLoading(false);

        if (res.ok) {
            toast.success("Thank you for sharing your experience.")
            onClose();
        } else {
            alert("Failed to submit review");
        }
    }

    return (
        <>
            {/* ---------- BACKDROP ---------- */}
            <div
                className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* ---------- MODAL ---------- */}
            <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                <div
                    className="
            w-full max-w-md
            bg-white rounded-2xl shadow-xl
            p-6 sm:p-8
            animate-in fade-in zoom-in-95
          "
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">
                            How was your appointment?
                        </h3>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <p className="text-sm text-gray-600 mb-4">
                        {appointment.practitioner_name}
                    </p>

                    {/* Rating */}
                    <StarRating value={rating} onChange={setRating} />

                    {/* Comment */}
                    <textarea
                        className="
              mt-4 w-full rounded-xl border border-gray-200
              px-3 py-2 text-sm
              focus:outline-none focus:ring-2 focus:ring-blue-500
            "
                        rows={3}
                        placeholder="Optional comment (avoid personal or medical details)"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                    />

                    {/* Actions */}
                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm rounded-lg text-gray-600 hover:bg-gray-100"
                        >
                            Skip
                        </button>
                        <button
                            onClick={submitReview}
                            disabled={loading}
                            className="
                px-5 py-2 text-sm rounded-lg text-white
                bg-blue-600 hover:bg-blue-700
                disabled:opacity-50
              "
                        >
                            {loading ? "Submitting..." : "Submit"}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}

/* ---------- STAR RATING ---------- */
function StarRating({ value, onChange }: any) {
    return (
        <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    onClick={() => onChange(star)}
                    className={`transition ${star <= value ? "text-yellow-400" : "text-gray-300"
                        }`}
                >
                    <Star fill={star <= value ? "currentColor" : "none"} />
                </button>
            ))}
        </div>
    );
}
