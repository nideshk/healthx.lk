'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import PaymentStep from '@/components/flow/PaymentStep';
import { Loader2 } from 'lucide-react';
import { authFetch } from '@/lib/authFetch';

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const appointmentId = searchParams.get('appointment_id');

  const [bookingData, setBookingData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAppointmentDetails() {
      if (!appointmentId) {
        router.push('/dashboard/appointment');
        return;
      }

      try {
        const res = await authFetch(`/api/booking/details?id=${appointmentId}`);

        if (!res.ok) {
          const errorBody = await res.json();
          throw new Error(errorBody?.error || "Failed to load");
        }

        const data = await res.json();

        const mappedData = {
          ...data,
          fullName: data.fullName,
          email: data.email,
          phone: data.phone,
          selectedDoctor: data.selectedDoctor,
          appointmentType: data.appointmentType
        };

        setBookingData(mappedData);
      } catch (error) {
        console.error("Error fetching appointment:", error);
        router.push('/dashboard/appointment');
      } finally {
        setLoading(false);
      }
    }

    fetchAppointmentDetails();
  }, [appointmentId, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <p className="text-gray-600 font-medium">Loading your secure checkout...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto">
      <PaymentStep
        nextStep={() => router.push('/dashboard/appointment')}
        bookingData={bookingData}
        isManualCheckout={true}
        preExistingId={appointmentId}
        prevStep={() => router.back()}
        updateData={() => { }}
        goToStep={() => { }}
        bookingControllerRef={{ current: {} } as any}
      />
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" />
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}