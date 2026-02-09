'use client';
import React from 'react';
import { CheckCircle, Calendar, Mail, Users, Phone } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

function PaymentConfirmation() {
    const router = useRouter();
    const t = useTranslations('PaymentConfirmation');

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-10">
            <div className="w-full max-w-3xl bg-white rounded-xl shadow-md overflow-hidden">
                {/* Success Banner */}
                <div className="bg-gradient-to-r from-green-500 to-green-700 text-white px-6 py-6 flex items-center gap-4">
                    <CheckCircle className="w-10 h-10" />
                    <div>
                        <h1 className="text-xl font-semibold">
                            {t('title')}
                        </h1>
                        <p className="text-sm opacity-90">{t('subtitle')}</p>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5">
                    {/* Title */}
                    <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-blue-600" />
                        {t('prepareTitle')}
                    </h2>

                    {/* Email Confirmation */}
                    <div className="border border-blue-200 bg-blue-50 rounded-lg p-4 text-sm text-blue-900">
                        <div className="flex items-center gap-2 font-semibold mb-1">
                            <Mail className="w-4 h-4" />
                            {t('email.title')}
                        </div>
                        <p>{t('email.description')}</p>
                    </div>

                    {/* Appointment Day */}
                    <div className="border border-green-200 bg-green-50 rounded-lg p-4 text-sm text-green-900">
                        <div className="flex items-center gap-2 font-semibold mb-1">
                            <Calendar className="w-4 h-4" />
                            {t('appointmentDay.title')}
                        </div>
                        <p>{t('appointmentDay.description')}</p>
                    </div>

                    {/* Additional Members */}
                    <div className="border border-purple-200 bg-purple-50 rounded-lg p-4 text-sm text-purple-900">
                        <div className="flex items-center gap-2 font-semibold mb-1">
                            <Users className="w-4 h-4" />
                            {t('members.title')}
                        </div>
                        <p>{t('members.description')}</p>
                    </div>

                    {/* Follow-up Call */}
                    <div className="border border-orange-200 bg-orange-50 rounded-lg p-4 text-sm text-orange-900">
                        <div className="flex items-center gap-2 font-semibold mb-1">
                            <Phone className="w-4 h-4" />
                            {t('followup.title')}
                        </div>
                        <p>{t('followup.description')}</p>
                    </div>

                    {/* Footer */}
                    <div className="pt-4 border-t text-center text-sm text-gray-600">
                        <p className="mb-4">{t('footer')}</p>
                        <button
                            onClick={() => router.push('/')}
                            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                        >
                            {t('returnHome')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PaymentConfirmation;
