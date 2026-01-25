import { useTranslations } from "next-intl";
import HowToFAQ from "./HowToFAQ";

export default function HowToPage() {
    const t = useTranslations("howto");

    return (
        <div className="max-w-4xl mx-auto px-4 py-16">
            <h1 className="text-4xl font-black text-slate-900">
                {t("title")}
            </h1>
            <p className="text-slate-600 mt-2 mb-10">
                {t("subtitle")}
            </p>

            <HowToFAQ />
        </div>
    );
}