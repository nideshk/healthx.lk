import Loader from '@/components/atom/Loader/Loader'
import { redirect } from 'next/navigation'
import React from 'react'

function page() {

    redirect('/dashboard')
  return (
    <div>
      <Loader size='lg'></Loader>
    </div>
  )
}

export default page