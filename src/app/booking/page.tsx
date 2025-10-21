// app/booking/page.tsx
import BookingForm from '../components/BookingForm';
import { requireUser } from '@/lib/authGuard';

export default async function BookingPage() {

    const {authorized, response, user} = await requireUser();
        if (authorized) {
            // Handle unauthorized access (e.g., redirect to login)
            return <div>Please log in to proceed with booking.</div>;
        }
    
        console.log(user);
  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <BookingForm data={user}/>
    </div>
  );
}