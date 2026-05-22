import HowToFAQ from "./HowToFAQ";
import { getLocaleFromCookie } from "@/utils/getLocale";

export default async function HowToPage() {
    const locale = await getLocaleFromCookie();
    const messages = (await import(`../../messages/${locale}.json`)).default;
    const t = messages.howto;

    return (
        <div className="max-w-4xl mx-auto px-4 py-16">
            <h1 className="text-4xl font-black text-slate-900">
                {t.title}
            </h1>
            <p className="text-slate-600 mt-2 mb-10">
                {t.subtitle}
            </p>

            <HowToFAQ />
        </div>
    );
}