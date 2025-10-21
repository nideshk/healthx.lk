import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import CreateAppointmentForm from '@/components/form/CreateAppointmentForm'
import FileUpload from '@/components/FileUpload'

export default async function DashboardPage() {
  const supabase = createServerComponentClient({ cookies })

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return <h1>
    Welcome {user.email} 

    Book an Appointment now!

<FileUpload></FileUpload>
    <CreateAppointmentForm/>
   </h1>
}
