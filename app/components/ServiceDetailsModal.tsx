import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Star } from 'lucide-react'
import Image from "next/image"

interface ServiceDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  service: any
}

export default function ServiceDetailsModal({ isOpen, onClose, service }: ServiceDetailsModalProps) {
  if (!service) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{service.name}</DialogTitle>
          <DialogDescription asChild>
            <div>
              <div className="flex items-center mt-2">
                <Star className="h-4 w-4 text-yellow-400 mr-1" />
                <span>{service.rating}</span>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Image
            src={service.image}
            alt={service.name}
            width={300}
            height={200}
            className="rounded-lg object-cover w-full"
          />
          <p>{service.description || "No description available."}</p>
          <div className="flex justify-between items-center">
            <span className="font-bold">${service.price}/hr</span>
            <span>{service.distance} miles away</span>
          </div>
        </div>
        <Button onClick={() => {/* Implement booking logic */}}>Book Now</Button>
      </DialogContent>
    </Dialog>
  )
}

