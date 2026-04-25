import React, { Suspense } from "react";
import ContactUs from "./ContactUs";

function ContactUsPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-teal-500" /></div>}>
            <ContactUs />
        </Suspense>
    );
}

export default ContactUsPage;