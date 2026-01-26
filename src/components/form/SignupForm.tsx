"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "react-toastify";
import { useTranslations } from "next-intl"; // Added for translations

/* ─────────────────────────────────────────────
   Sri Lanka Static Location Data
───────────────────────────────────────────── */
const SRI_LANKA_LOCATIONS: Record<string, string[]> = {
  Western: ["Colombo", "Dehiwala", "Moratuwa", "Kotte", "Negombo", "Panadura"],
  Central: ["Kandy", "Peradeniya", "Matale", "Nuwara Eliya", "Hatton"],
  Southern: ["Galle", "Matara", "Hambantota"],
  Northern: ["Jaffna", "Kilinochchi", "Mannar", "Vavuniya"],
  Eastern: ["Trincomalee", "Batticaloa", "Ampara"],
  "North Western": ["Kurunegala", "Puttalam", "Chilaw"],
  "North Central": ["Anuradhapura", "Polonnaruwa"],
  Uva: ["Badulla", "Monaragala"],
  Sabaragamuwa: ["Ratnapura", "Kegalle"],
};

export default function SignupForm() {
  const t = useTranslations("signup"); // Initialize translations
  const router = useRouter();

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    date_of_birth: "",
    gender_identity: "",
    phone: "",
    emergency_contact: "",
    government_id_type: "passport",
    government_id_number: "",
    address: "",
    country: "",
    state_province: "",
    city: "",
    pin_code: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ─────────────────────────────
     Handlers
  ───────────────────────────── */
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSignup = async () => {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (data.requires_email_verification) {
        toast.info(t("messages.verifyEmail"));
        router.push("/");
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || t("messages.signupFailed"));
      }

      toast.success(t("messages.signupSuccess"));

      setTimeout(() => {
        router.push("/");
      }, 1200);
    } catch (err: any) {
      console.error(err);
      setError(err.message || t("messages.unexpectedError"));
    } finally {
      setLoading(false);
    }
  };

  /* ─────────────────────────────
     Render
  ───────────────────────────── */
  return (
    <div className="flex justify-center px-4 py-10">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSignup();
        }}
        className="w-full max-w-xl space-y-4 rounded-lg bg-white p-8 shadow-lg"
      >
        <h1 className="text-center text-2xl font-bold">
          {t("title")}
        </h1>

        {error && (
          <p className="rounded bg-red-50 p-2 text-center text-sm text-red-600">
            {error}
          </p>
        )}

        {/* Name */}
        <div className="grid grid-cols-2 gap-4">
          <input
            name="first_name"
            placeholder={t("placeholders.firstName")}
            value={form.first_name}
            onChange={handleChange}
            required
            className="input"
          />
          <input
            name="last_name"
            placeholder={t("placeholders.lastName")}
            value={form.last_name}
            onChange={handleChange}
            required
            className="input"
          />
        </div>

        {/* Email */}
        <input
          name="email"
          type="email"
          placeholder={t("placeholders.email")}
          value={form.email}
          onChange={handleChange}
          required
          className="input"
        />

        {/* Password */}
        <input
          name="password"
          type="password"
          placeholder={t("placeholders.password")}
          value={form.password}
          onChange={handleChange}
          required
          minLength={8}
          className="input"
        />

        {/* DOB & Gender */}
        <div className="grid grid-cols-2 gap-4">
          <input
            name="date_of_birth"
            type="date"
            value={form.date_of_birth}
            onChange={handleChange}
            required
            className="input"
          />
          <select
            name="gender_identity"
            value={form.gender_identity}
            onChange={handleChange}
            className="input"
          >
            <option value="male">{t("gender.male")}</option>
            <option value="female">{t("gender.female")}</option>
            <option value="non-binary">{t("gender.nonBinary")}</option>
            <option value="unspecified">{t("gender.unspecified")}</option>
          </select>
        </div>

        {/* Phone */}
        <input
          name="phone"
          placeholder="+94771234567"
          value={form.phone}
          onChange={handleChange}
          required
          className="input"
        />

        {/* Emergency Contact */}
        <input
          name="emergency_contact"
          placeholder={t("placeholders.emergencyContact")}
          value={form.emergency_contact}
          onChange={handleChange}
          className="input"
        />

        {/* Government ID */}
        <div className="grid grid-cols-2 gap-4">
          <select
            name="government_id_type"
            value={form.government_id_type}
            onChange={handleChange}
            className="input"
          >
            <option value="passport">{t("idType.passport")}</option>
            <option value="nic">{t("idType.nic")}</option>
            <option value="driving_license">{t("idType.license")}</option>
          </select>

          <input
            name="government_id_number"
            placeholder={t("placeholders.idNumber")}
            value={form.government_id_number}
            onChange={handleChange}
            required
            className="input"
          />
        </div>

        {/* Address */}
        <input
          name="address"
          placeholder={t("placeholders.address")}
          value={form.address}
          onChange={handleChange}
          className="input"
        />

        {/* Country */}
        <input
          value={t("countryDefault")}
          disabled
          className="input bg-gray-100"
        />

        {/* Province */}
        <input
          list="province-list"
          name="state_province"
          placeholder={t("placeholders.province")}
          value={form.state_province}
          onChange={handleChange}
          required
          className="input"
        />
        <datalist id="province-list">
          {Object.keys(SRI_LANKA_LOCATIONS).map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>

        {/* City */}
        <input
          list="city-list"
          name="city"
          placeholder={t("placeholders.city")}
          value={form.city}
          onChange={handleChange}
          required
          className="input"
        />
        <datalist id="city-list">
          {(SRI_LANKA_LOCATIONS[form.state_province] || []).map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>

        {/* PIN */}
        <input
          name="pin_code"
          placeholder={t("placeholders.pinCode")}
          value={form.pin_code}
          onChange={handleChange}
          required
          className="input"
        />

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-indigo-600 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? t("buttonLoading") : t("buttonDefault")}
        </button>
      </form>

      {/* Styles */}
      <style jsx>{`
        .input {
          width: 100%;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
        }
        .input:focus {
          outline: none;
          border-color: #6366f1;
          box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.3);
        }
      `}</style>
    </div>
  );
}