'use client'
import React, { useState, FormEvent } from 'react'; 
// import { useRouter } from 'next/navigation'; // REMOVED: Not needed for form submission redirect

// Extend the Window interface to include the PayHere SDK functions
// NOTE: We keep the interface for typing but will NOT use window.payhere methods
declare global {
    interface Window {
        payhere: {
            startPayment: (payment: PayHerePayload) => void;
            onCompleted?: (orderId: string) => void;
            onDismissed?: () => void;
            onError?: (error: any) => void;
        };
    }
}

// TypeScript interface for the collected patient data
interface PatientData {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    country: string;
    booking_amount: string;
}

// TypeScript interface for the final payload returned by your API
interface PayHerePayload extends PatientData {
    sandbox: boolean;
    merchant_id: string;
    return_url: string;
    cancel_url: string;
    notify_url: string;
    order_id: string;
    hash: string;
    amount: string;
    currency: string;
    items: string;
}

// Utility function to submit payment via hidden form (Checkout API method)
const submitPaymentForm = (payment: PayHerePayload) => {
    // 🛑 This is the action URL for the Checkout API redirect method
    const PAYHERE_CHECKOUT_URL = 'https://sandbox.payhere.lk/pay/checkout'; 
    
    const form = document.createElement('form');
    form.method = 'post';
    form.action = PAYHERE_CHECKOUT_URL; 
    
    for (const key in payment) {
        if (payment.hasOwnProperty(key)) {
            const hiddenField = document.createElement('input');
            hiddenField.type = 'hidden';
            hiddenField.name = key;
            hiddenField.value = payment[key] as string; // Assert as string for form value
            form.appendChild(hiddenField);
        }
    }
    document.body.appendChild(form);
    form.submit(); 
};

export default function BookingForm({data}: {data: any}) {
    
    // const router = useRouter(); // REMOVED: Not needed

    const [formData, setFormData] = useState<PatientData>({
        first_name: 'Test', last_name: 'Patient', 
        email: 'test@practo.lk', phone: '0771234567',
        address: 'No. 1 Booking Lane', city: 'Colombo', country: 'Sri Lanka',
        booking_amount: '100.00',
    });
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    
    // Removed isSdkReady state and useEffect polling logic

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handlePayment = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        
        try {
            // 1. Call YOUR secure API route to get the hash and final payload
            const apiResponse = await fetch('/api/payhere', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (!apiResponse.ok) {
                const errData = await apiResponse.json();
                throw new Error(errData.error || 'Failed to initialize payment from server.');
            }

            // The API returns { payment: PayHerePayload }
            const { payment: payHerePayload } = await apiResponse.json();
            
            console.log("Received Hashed Payload:", payHerePayload);

            // 2. 🛑 Initiate Payment via REDIRECT (Checkout API method)
            submitPaymentForm(payHerePayload); 
            
            // Note: The browser is now leaving this page, so we don't clear loading state here.

        } catch (err: any) {
            console.error("Payment initiation failed:", err);
            setError(err.message || 'An unknown server error occurred.');
            setIsLoading(false); 
        }
    };

    return (
        <form onSubmit={handlePayment} className="max-w-md mx-auto p-4 bg-white shadow-lg rounded-lg space-y-4">
            <h2 className="text-xl font-bold text-black">Patient Details & Payment</h2>
            
            {/* The SDK status message is removed */}
            {error && <div className="text-red-600 text-sm p-2 bg-red-100 rounded">{error}</div>}
            
            {/* Input fields */}
            <input type="text" name="first_name" placeholder="First Name" value={formData.first_name} onChange={handleInputChange} className="w-full p-2 border rounded text-black" required />
            <input type="text" name="last_name" placeholder="Last Name" value={formData.last_name} onChange={handleInputChange} className="w-full p-2 border rounded text-black" required />
            <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleInputChange} className="w-full p-2 border rounded text-black" required />
            <input type="text" name="phone" placeholder="Phone" value={formData.phone} onChange={handleInputChange} className="w-full p-2 border rounded text-black" required />
            <input type="text" name="address" placeholder="Address" value={formData.address} onChange={handleInputChange} className="w-full p-2 border rounded text-black" required />
            <input type="text" name="city" placeholder="City" value={formData.city} onChange={handleInputChange} className="w-full p-2 border rounded text-black" required />
            <input type="text" name="country" placeholder="Country" value={formData.country} onChange={handleInputChange} className="w-full p-2 border rounded text-black" required />
            <input type="text" name="booking_amount" placeholder="Amount" value={formData.booking_amount} onChange={handleInputChange} className="w-full p-2 border rounded text-black" required />
            
            <button 
                type="submit" 
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full disabled:opacity-50 transition duration-150"
            >
                {isLoading ? 'Redirecting to Gateway...' : `Pay ${formData.booking_amount} LKR`}
            </button>
        </form>
    );
}
