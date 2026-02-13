"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "react-toastify";
import { useTranslations } from "next-intl";

export default function SignupForm() {
  const t = useTranslations("signup");
  const router = useRouter();

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    date_of_birth: "",
    gender_identity: "male",
    phone: "",
    government_id_type: "passport",
    government_id_number: "",
    address: "",
    country: "",
    state_province: "",
    city: "",
    marketing_consent: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
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

      if (!res.ok) throw new Error(data.error || t("messages.signupFailed"));

      toast.success(t("messages.signupSuccess"));
      setTimeout(() => router.push("/"), 1200);
    } catch (err: any) {
      const errorMsg = err.message || t("messages.unexpectedError");
      setError(errorMsg);
      toast.error(errorMsg); // Using toast as requested
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center px-4 py-12 bg-gray-50 min-h-screen">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSignup();
        }}
        className="w-full max-w-2xl space-y-6 rounded-xl bg-white p-10 shadow-xl border border-gray-100"
      >
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            {t("title")}
          </h1>
          <p className="text-gray-500 text-sm">{t("labels.subtitle")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* First Name */}
          <div className="space-y-1">
            <label className="label-style">{t("labels.firstName")}</label>
            <input
              name="first_name"
              placeholder={t("placeholders.firstName")}
              value={form.first_name}
              onChange={handleChange}
              required
              className="input"
            />
          </div>

          {/* Last Name */}
          <div className="space-y-1">
            <label className="label-style">{t("labels.lastName")}</label>
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
          <div className="md:col-span-2 space-y-1">
            <label className="label-style">{t("labels.email")}</label>
            <input
              name="email"
              type="email"
              placeholder={t("placeholders.email")}
              value={form.email}
              onChange={handleChange}
              required
              className="input"
            />
          </div>

          {/* Password with Eye Icon */}
          <div className="md:col-span-2 space-y-1">
            <label className="label-style">{t("labels.password")}</label>
            <div className="relative">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder={t("placeholders.password")}
                value={form.password}
                onChange={handleChange}
                required
                minLength={8}
                className="input pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-teal-600 transition-colors"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.644C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.43 0 .637C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Date of Birth */}
          <div className="space-y-1">
            <label className="label-style">{t("labels.dateOfBirth")}</label>
            <input
              name="date_of_birth"
              type="date"
              value={form.date_of_birth}
              onChange={handleChange}
              required
              className="input"
            />
          </div>

          {/* Gender */}
          <div className="space-y-1">
            <label className="label-style">{t("labels.gender")}</label>
            <select
              name="gender_identity"
              value={form.gender_identity}
              onChange={handleChange}
              className="input"
            >
              <option value="male">{t("gender.male")}</option>
              <option value="female">{t("gender.female")}</option>
              <option value="others">{t("gender.others")}</option>
            </select>
          </div>

          {/* Phone */}
          <div className="md:col-span-2 space-y-1">
            <label className="label-style">{t("labels.phoneNumber")}</label>
            <input
              name="phone"
              placeholder="+94 77 123 4567"
              value={form.phone}
              onChange={handleChange}
              required
              className="input"
            />
          </div>

          {/* ID Type */}
          <div className="space-y-1">
            <label className="label-style">{t("labels.idType")}</label>
            <select
              name="government_id_type"
              value={form.government_id_type}
              onChange={handleChange}
              className="input"
            >
              <option value="passport">{t("idType.passport")}</option>
              <option value="nic">{t("idType.nic")}</option>
            </select>
          </div>

          {/* ID Number */}
          <div className="space-y-1">
            <label className="label-style">{t("labels.idNumber")}</label>
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
          <div className="md:col-span-2 space-y-1">
            <label className="label-style">{t("labels.streetAddress")}</label>
            <input
              name="address"
              placeholder={t("placeholders.address")}
              value={form.address}
              onChange={handleChange}
              className="input"
            />
          </div>

          {/* Location Fields (Inputs as requested) */}
          <div className="space-y-1">
            <label className="label-style">{t("labels.country")}</label>
            <input
              name="country"
              placeholder={t("countryDefault")}
              value={form.country}
              onChange={handleChange}
              required
              className="input"
            />
          </div>

          <div className="space-y-1">
            <label className="label-style">{t("labels.stateProvince")}</label>
            <input
              name="state_province"
              placeholder={t("placeholders.province")}
              value={form.state_province}
              onChange={handleChange}
              required
              className="input"
            />
          </div>

          <div className="md:col-span-2 space-y-1">
            <label className="label-style">{t("labels.city")}</label>
            <input
              name="city"
              placeholder={t("placeholders.city")}
              value={form.city}
              onChange={handleChange}
              required
              className="input"
            />
          </div>
        </div>

        {/* Marketing Consent */}
        <label className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 border border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors">
          <input
            type="checkbox"
            name="marketing_consent"
            checked={form.marketing_consent}
            onChange={handleChange}
            className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
          />
          <span className="text-sm text-gray-600 leading-tight">
            {t("marketingConsent")}
          </span>
        </label>

        {/* Action Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-teal-600 py-3.5 text-lg font-semibold text-white shadow-lg shadow-teal-100 hover:bg-teal-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
             <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {t("buttonLoading")}
             </span>
          ) : (
            t("buttonDefault")
          )}
        </button>
      </form>

      <style jsx>{`
        .label-style {
          display: block;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          color: #4b5563;
          margin-left: 0.25rem;
        }
        .input {
          width: 100%;
          border: 1.5px solid #e5e7eb;
          border-radius: 0.5rem;
          padding: 0.75rem 1rem;
          font-size: 0.95rem;
          color: #1f2937;
          background-color: #ffffff;
          transition: all 0.2s ease-in-out;
        }
        .input:focus {
          outline: none;
          border-color: #0d9488;
          background-color: #fff;
          box-shadow: 0 0 0 4px rgba(13, 148, 136, 0.1);
        }
        .input::placeholder {
          color: #9ca3af;
        }
      `}</style>
    </div>
  );
}