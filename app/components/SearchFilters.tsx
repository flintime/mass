import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"

const availabilityOptions = [
  { id: "anytime", label: "Anytime" },
  { id: "today", label: "Today" },
  { id: "tomorrow", label: "Tomorrow" },
  { id: "this-week", label: "This Week" },
]

export function SearchFilters({
  ratingFilter,
  setRatingFilter,
  availabilityFilter,
  setAvailabilityFilter,
  offersFilter,
  setOffersFilter
}: {
  ratingFilter: string;
  setRatingFilter: (value: string) => void;
  availabilityFilter: string;
  setAvailabilityFilter: (value: string) => void;
  offersFilter: boolean;
  setOffersFilter: (value: boolean) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">
          Filters
          {(ratingFilter || availabilityFilter !== "anytime" || offersFilter) && (
            <Badge variant="secondary" className="ml-2 bg-violet-500 text-white">
              {(ratingFilter ? 1 : 0) + (availabilityFilter !== "anytime" ? 1 : 0) + (offersFilter ? 1 : 0)}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Rating</h4>
            <RadioGroup value={ratingFilter} onValueChange={setRatingFilter}>
              {[5, 4, 3, 2, 1].map((value) => (
                <div key={value} className="flex items-center space-x-2">
                  <RadioGroupItem value={value.toString()} id={`rating-${value}`} />
                  <Label htmlFor={`rating-${value}`}>{value}+ Stars</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Availability</h4>
            <RadioGroup value={availabilityFilter} onValueChange={setAvailabilityFilter}>
              {availabilityOptions.map((option) => (
                <div key={option.id} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.id} id={option.id} />
                  <Label htmlFor={option.id}>{option.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Offers</h4>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="offers"
                checked={offersFilter}
                onCheckedChange={(checked) => setOffersFilter(checked as boolean)}
              />
              <Label htmlFor="offers">Show services with offers</Label>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

