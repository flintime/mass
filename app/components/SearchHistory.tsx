import { Button } from "@/components/ui/button"
import { History } from 'lucide-react'

interface SearchHistoryProps {
  history: string[]
  onSelect: (query: string) => void
}

export default function SearchHistory({ history, onSelect }: SearchHistoryProps) {
  if (history.length === 0) return null

  return (
    <div className="mb-4">
      <h3 className="text-lg font-semibold mb-2">Recent Searches</h3>
      <div className="flex flex-wrap gap-2">
        {history.map((query, index) => (
          <Button key={index} variant="outline" size="sm" onClick={() => onSelect(query)}>
            <History className="mr-2 h-4 w-4" />
            {query}
          </Button>
        ))}
      </div>
    </div>
  )
}

