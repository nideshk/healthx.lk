import { redirect } from 'next/navigation';

export default function NotFound() {
  // redirect to another page (for example, dashboard)
  redirect('/');
  
  // OR if you want to show a custom 404 UI:
  // return <h1>Page not found. Redirecting...</h1>;
}
