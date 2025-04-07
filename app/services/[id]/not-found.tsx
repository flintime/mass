import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="container mx-auto px-4 py-8 text-center">
      <h2 className="text-2xl font-bold mb-4">404 - Service Not Found</h2>
      <p className="mb-4">Sorry, the service you're looking for doesn't exist or has been removed.</p>
      <Link href="/search" className="text-blue-500 hover:underline">
        Return to search
      </Link>
    </div>
  )
}

