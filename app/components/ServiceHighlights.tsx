import { type LucideIcon } from 'lucide-react'

interface Highlight {
  icon: LucideIcon
  text: string
}

interface ServiceHighlightsProps {
  highlights: Highlight[]
}

export default function ServiceHighlights({ highlights }: ServiceHighlightsProps) {
  return (
    <div className="flex flex-wrap gap-4">
      {highlights.map((highlight, index) => (
        <div key={index} className="flex items-center text-gray-600">
          <highlight.icon className="h-5 w-5 mr-2" />
          <span>{highlight.text}</span>
        </div>
      ))}
    </div>
  )
}

