import Image from 'next/image'
import Link from 'next/link'

interface RelatedService {
  id: number
  name: string
  image: string
}

interface RelatedServicesProps {
  services?: RelatedService[]
}

export default function RelatedServices({ services = [] }: RelatedServicesProps) {
  if (!services || services.length === 0) {
    return null
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {services.map((service) => (
        <Link key={service.id} href={`/${service.id}`} className="block">
          <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
            <Image
              src={service.image}
              alt={service.name}
              width={100}
              height={100}
              className="rounded-lg mb-2"
            />
            <h3 className="font-semibold text-sm">{service.name}</h3>
          </div>
        </Link>
      ))}
    </div>
  )
}

