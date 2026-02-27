import Link from 'next/link';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="flex min-h-[80vh] flex-col items-center justify-center px-6 text-center">
      <div className="space-y-4">
        {/* Visual Cue */}
        <h1 className="text-9xl font-extrabold tracking-widest text-gray-200">
          404
        </h1>

        {/* Message */}
        <div className="bg-blue-500 px-2 text-sm rounded rotate-12 absolute transform -translate-y-20 translate-x-12">
          Page not found
        </div>

        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Uh-oh! We lost you.
        </h2>

        <p className="mx-auto max-w-lg text-gray-500">
          The page you’re looking for doesn’t exist or has been moved.
          Don't worry, even the best explorers get lost sometimes.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          <Home size={18} />
          Back to Home
        </Link>
      </div>
    </main>
  );
}