'use client';

import { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { businessAuth } from "@/lib/businessAuth";
import { useRouter } from "next/navigation";
import { format, addMinutes, parse, isAfter, eachHourOfInterval, startOfDay, endOfDay, isSameDay } from "date-fns";
import { Clock, Plus, Copy, Repeat, AlertCircle, Save, Calendar as CalendarIcon, Edit2, Trash2, Download, Upload, PlusCircle, Settings, X, Check } from 'lucide-react';
import { toast } from "@/components/ui/use-toast";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TimeSlot {
  day: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  services: string[]; // IDs of services available in this slot
}

interface DayAvailability {
  [key: string]: TimeSlot[];
}

interface Template {
  name: string;
  slots: Omit<TimeSlot, 'day'>[];
}

interface Appointment {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  customerName: string;
  service: string;
}

interface ExportData {
  availability: DayAvailability;
  customTemplates: Template[];
  version: string;
}

interface Service {
  id: string;
  name: string;
  duration: number; // in minutes
  description: string;
  price: number;
}

const DEFAULT_TEMPLATES: Template[] = [
  {
    name: "Full Day (9-5)",
    slots: [{ startTime: '09:00', endTime: '17:00', isAvailable: true, services: [] }]
  },
  {
    name: "Morning Only",
    slots: [{ startTime: '09:00', endTime: '13:00', isAvailable: true, services: [] }]
  },
  {
    name: "Afternoon Only",
    slots: [{ startTime: '13:00', endTime: '17:00', isAvailable: true, services: [] }]
  },
  {
    name: "Split Day",
    slots: [
      { startTime: '09:00', endTime: '12:00', isAvailable: true, services: [] },
      { startTime: '14:00', endTime: '18:00', isAvailable: true, services: [] }
    ]
  }
];

export default function CalendarPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [date, setDate] = useState<Date>(new Date());
  const [availability, setAvailability] = useState<DayAvailability>({});
  const [selectedDay, setSelectedDay] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [showRecurringDialog, setShowRecurringDialog] = useState(false);
  const [recurringDays, setRecurringDays] = useState<number[]>([]);
  const [customTemplates, setCustomTemplates] = useState<Template[]>([]);
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [showBulkEditDialog, setShowBulkEditDialog] = useState(false);
  const [bulkEditDates, setBulkEditDates] = useState<Date[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [showTimeline, setShowTimeline] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [showServiceDialog, setShowServiceDialog] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [newService, setNewService] = useState<Partial<Service>>({
    name: '',
    duration: 60,
    description: '',
    price: 0
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (!businessAuth.isAuthenticated()) {
          router.push('/business/signin');
          return;
        }

        // TODO: Replace with actual API calls
        const mockServices: Service[] = [
          {
            id: '1',
            name: 'Basic Consultation',
            duration: 60,
            description: 'Initial consultation session',
            price: 100
          },
          {
            id: '2',
            name: 'Follow-up Session',
            duration: 30,
            description: 'Follow-up consultation',
            price: 50
          }
        ];

        setServices(mockServices);

        // TODO: Replace with actual API call to fetch business availability
        const mockAvailability: DayAvailability = {
          [format(new Date(), 'yyyy-MM-dd')]: [
            {
              day: format(new Date(), 'yyyy-MM-dd'),
              startTime: '09:00',
              endTime: '12:00',
              isAvailable: true,
              services: [] // Initialize with empty services array
            },
            {
              day: format(new Date(), 'yyyy-MM-dd'),
              startTime: '13:00',
              endTime: '17:00',
              isAvailable: true,
              services: [] // Initialize with empty services array
            }
          ]
        };

        setAvailability(mockAvailability);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const validateTimeSlot = (startTime: string, endTime: string, currentSlots: TimeSlot[], index?: number): boolean => {
    const start = parse(startTime, 'HH:mm', new Date());
    const end = parse(endTime, 'HH:mm', new Date());

    if (!isAfter(end, start)) {
      toast({
        title: "Invalid Time Slot",
        description: "End time must be after start time",
        variant: "destructive"
      });
      return false;
    }

    // Check for overlaps with existing slots
    const hasOverlap = currentSlots.some((slot, i) => {
      if (index !== undefined && i === index) return false;
      
      const existingStart = parse(slot.startTime, 'HH:mm', new Date());
      const existingEnd = parse(slot.endTime, 'HH:mm', new Date());

      return (
        (isAfter(start, existingStart) && !isAfter(start, existingEnd)) ||
        (isAfter(end, existingStart) && !isAfter(end, existingEnd)) ||
        (!isAfter(start, existingStart) && isAfter(end, existingEnd))
      );
    });

    if (hasOverlap) {
      toast({
        title: "Time Slot Overlap",
        description: "This time slot overlaps with an existing slot",
        variant: "destructive"
      });
      return false;
    }

    // Check for appointment conflicts
    const dayAppointments = appointments.filter(apt => apt.date === selectedDay);
    const hasAppointmentConflict = dayAppointments.some(apt => {
      const aptStart = parse(apt.startTime, 'HH:mm', new Date());
      const aptEnd = parse(apt.endTime, 'HH:mm', new Date());

      return (
        (isAfter(start, aptStart) && !isAfter(start, aptEnd)) ||
        (isAfter(end, aptStart) && !isAfter(end, aptEnd)) ||
        (!isAfter(start, aptStart) && isAfter(end, aptEnd))
      );
    });

    if (hasAppointmentConflict) {
      toast({
        title: "Appointment Conflict",
        description: "This time slot conflicts with an existing appointment",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      const formattedDate = format(date, 'yyyy-MM-dd');
      setDate(date);
      setSelectedDay(formattedDate);
      
      if (!availability[formattedDate]) {
        setAvailability(prev => ({
          ...prev,
          [formattedDate]: []
        }));
      }
    }
  };

  const addTimeSlot = () => {
    const newSlot: TimeSlot = {
      day: selectedDay,
      startTime: '09:00',
      endTime: '17:00',
      isAvailable: true,
      services: [] // Initialize empty services array
    };

    if (validateTimeSlot(newSlot.startTime, newSlot.endTime, availability[selectedDay] || [])) {
      setAvailability(prev => ({
        ...prev,
        [selectedDay]: [...(prev[selectedDay] || []), newSlot]
      }));
    }
  };

  const updateTimeSlot = (index: number, field: keyof TimeSlot, value: string | boolean | string[]) => {
    const currentSlots = availability[selectedDay];
    const updatedSlot = { ...currentSlots[index], [field]: value };

    if (field === 'startTime' || field === 'endTime') {
      if (!validateTimeSlot(
        field === 'startTime' ? value as string : updatedSlot.startTime,
        field === 'endTime' ? value as string : updatedSlot.endTime,
        currentSlots,
        index
      )) {
        return;
      }
    }

    setAvailability(prev => ({
      ...prev,
      [selectedDay]: prev[selectedDay].map((slot, i) => 
        i === index ? updatedSlot : slot
      )
    }));
  };

  const removeTimeSlot = (index: number) => {
    setAvailability(prev => ({
      ...prev,
      [selectedDay]: prev[selectedDay].filter((_, i) => i !== index)
    }));
  };

  const applyTemplate = (template: Template) => {
    const newSlots = template.slots.map(slot => ({
      ...slot,
      day: selectedDay
    }));

    setAvailability(prev => ({
      ...prev,
      [selectedDay]: newSlots
    }));
  };

  const copyToNextWeek = () => {
    const nextWeekDate = new Date(date);
    nextWeekDate.setDate(nextWeekDate.getDate() + 7);
    const nextWeekDay = format(nextWeekDate, 'yyyy-MM-dd');

    const currentSlots = availability[selectedDay] || [];
    const newSlots = currentSlots.map(slot => ({
      ...slot,
      day: nextWeekDay
    }));

    setAvailability(prev => ({
      ...prev,
      [nextWeekDay]: newSlots
    }));

    toast({
      title: "Time Slots Copied",
      description: `Availability copied to ${format(nextWeekDate, 'MMMM d, yyyy')}`,
    });
  };

  const applyRecurring = () => {
    const currentSlots = availability[selectedDay] || [];
    const recurring: { [key: string]: TimeSlot[] } = {};

    // Apply to the next 4 weeks
    for (let week = 1; week <= 4; week++) {
      recurringDays.forEach(day => {
        const targetDate = new Date(date);
        // Adjust the date to match the day of week
        targetDate.setDate(targetDate.getDate() + ((day + 7 - targetDate.getDay()) % 7) + (week - 1) * 7);
        const targetDay = format(targetDate, 'yyyy-MM-dd');

        recurring[targetDay] = currentSlots.map(slot => ({
          ...slot,
          day: targetDay
        }));
      });
    }

    setAvailability(prev => ({
      ...prev,
      ...recurring
    }));

    setShowRecurringDialog(false);
    toast({
      title: "Recurring Availability Set",
      description: "Time slots have been applied to selected days for the next 4 weeks",
    });
  };

  const saveAsTemplate = () => {
    if (!newTemplateName.trim()) {
      toast({
        title: "Template Name Required",
        description: "Please enter a name for your template",
        variant: "destructive"
      });
      return;
    }

    const currentSlots = availability[selectedDay] || [];
    const newTemplate: Template = {
      name: newTemplateName,
      slots: currentSlots.map(({ day, ...rest }) => rest)
    };

    setCustomTemplates(prev => [...prev, newTemplate]);
    setNewTemplateName('');
    setShowSaveTemplateDialog(false);

    toast({
      title: "Template Saved",
      description: `Template "${newTemplateName}" has been saved`,
    });
  };

  const deleteTemplate = (index: number) => {
    setCustomTemplates(prev => prev.filter((_, i) => i !== index));
    toast({
      title: "Template Deleted",
      description: "Custom template has been removed",
    });
  };

  const applyBulkEdit = () => {
    const currentSlots = availability[selectedDay] || [];
    const bulkUpdates: { [key: string]: TimeSlot[] } = {};

    bulkEditDates.forEach(date => {
      const formattedDate = format(date, 'yyyy-MM-dd');
      bulkUpdates[formattedDate] = currentSlots.map(slot => ({
        ...slot,
        day: formattedDate
      }));
    });

    setAvailability(prev => ({
      ...prev,
      ...bulkUpdates
    }));

    setBulkEditDates([]);
    setShowBulkEditDialog(false);

    toast({
      title: "Bulk Edit Applied",
      description: `Time slots copied to ${bulkEditDates.length} selected dates`,
    });
  };

  const renderTimeline = () => {
    const hours = eachHourOfInterval({
      start: startOfDay(new Date(selectedDay)),
      end: endOfDay(new Date(selectedDay))
    });

    const dayAppointments = appointments.filter(apt => 
      apt.date === selectedDay
    );

    const timeSlots = availability[selectedDay] || [];

    return (
      <div className="mt-6">
        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-16 bg-gray-50 border-r"></div>
          <div className="ml-16 relative">
            {hours.map((hour, index) => (
              <div key={index} className="h-16 border-b relative">
                <span className="absolute -left-16 -top-3 text-sm text-gray-500">
                  {format(hour, 'HH:mm')}
                </span>
              </div>
            ))}
            {timeSlots.map((slot, index) => {
              const start = parse(slot.startTime, 'HH:mm', new Date(selectedDay));
              const end = parse(slot.endTime, 'HH:mm', new Date(selectedDay));
              const startMinutes = start.getHours() * 60 + start.getMinutes();
              const duration = (end.getHours() * 60 + end.getMinutes()) - startMinutes;
              
              return (
                <div
                  key={`slot-${index}`}
                  className={`absolute left-0 right-0 ${slot.isAvailable ? 'bg-violet-100' : 'bg-gray-100'} rounded`}
                  style={{
                    top: `${(startMinutes / 60) * 64}px`,
                    height: `${(duration / 60) * 64}px`,
                  }}
                >
                  <div className="p-2 text-sm">
                    {slot.startTime} - {slot.endTime}
                  </div>
                </div>
              );
            })}
            {dayAppointments.map((apt, index) => {
              const start = parse(apt.startTime, 'HH:mm', new Date(selectedDay));
              const end = parse(apt.endTime, 'HH:mm', new Date(selectedDay));
              const startMinutes = start.getHours() * 60 + start.getMinutes();
              const duration = (end.getHours() * 60 + end.getMinutes()) - startMinutes;
              
              return (
                <div
                  key={`apt-${index}`}
                  className="absolute left-0 right-0 bg-blue-100 rounded border border-blue-200"
                  style={{
                    top: `${(startMinutes / 60) * 64}px`,
                    height: `${(duration / 60) * 64}px`,
                  }}
                >
                  <div className="p-2 text-sm">
                    <div className="font-semibold">{apt.customerName}</div>
                    <div>{apt.service}</div>
                    <div>{apt.startTime} - {apt.endTime}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const exportAvailability = () => {
    const exportData: ExportData = {
      availability,
      customTemplates,
      version: '1.0'
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `availability-${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Settings Exported",
      description: "Your availability settings have been exported successfully",
    });
  };

  const importAvailability = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string) as ExportData;
        
        // Validate the imported data
        if (!importedData.version || !importedData.availability) {
          throw new Error('Invalid file format');
        }

        setAvailability(importedData.availability);
        if (importedData.customTemplates) {
          setCustomTemplates(importedData.customTemplates);
        }

        toast({
          title: "Settings Imported",
          description: "Your availability settings have been imported successfully",
        });
      } catch (error) {
        toast({
          title: "Import Failed",
          description: "The selected file is not a valid availability settings file",
          variant: "destructive"
        });
      }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset the input
  };

  const handleServiceSubmit = () => {
    if (!newService.name || !newService.duration) {
      toast({
        title: "Invalid Service",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    if (editingService) {
      // Update existing service
      setServices(prev => prev.map(service => 
        service.id === editingService.id 
          ? { ...newService, id: editingService.id } as Service
          : service
      ));
    } else {
      // Add new service
      setServices(prev => [...prev, {
        ...newService,
        id: Math.random().toString(36).substr(2, 9)
      } as Service]);
    }

    setShowServiceDialog(false);
    setEditingService(null);
    setNewService({
      name: '',
      duration: 60,
      description: '',
      price: 0
    });

    toast({
      title: editingService ? "Service Updated" : "Service Added",
      description: `Service "${newService.name}" has been ${editingService ? 'updated' : 'added'} successfully`,
    });
  };

  const deleteService = (serviceId: string) => {
    setServices(prev => prev.filter(service => service.id !== serviceId));
    toast({
      title: "Service Deleted",
      description: "Service has been removed successfully",
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold">Availability Calendar</h1>
        <div className="mt-8">Loading calendar...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Availability Calendar</h1>
        <div className="flex space-x-4">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Clock className="w-4 h-4 mr-2" />
                Templates
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Manage Templates</DialogTitle>
              </DialogHeader>
              <Tabs defaultValue="default">
                <TabsList>
                  <TabsTrigger value="default">Default Templates</TabsTrigger>
                  <TabsTrigger value="custom">Custom Templates</TabsTrigger>
                </TabsList>
                <TabsContent value="default">
                  <ScrollArea className="h-[300px]">
                    <div className="grid gap-4 py-4">
                      {DEFAULT_TEMPLATES.map((template, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          className="justify-start"
                          onClick={() => applyTemplate(template)}
                        >
                          {template.name}
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>
                <TabsContent value="custom">
                  <ScrollArea className="h-[300px]">
                    <div className="grid gap-4 py-4">
                      {customTemplates.map((template, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            className="flex-1 justify-start"
                            onClick={() => applyTemplate(template)}
                          >
                            {template.name}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteTemplate(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowSaveTemplateDialog(true)}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Current as Template
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button variant="outline" onClick={copyToNextWeek}>
            <Copy className="w-4 h-4 mr-2" />
            Copy to Next Week
          </Button>

          <Button variant="outline" onClick={() => setShowBulkEditDialog(true)}>
            <Edit2 className="w-4 h-4 mr-2" />
            Bulk Edit
          </Button>

          <Dialog open={showRecurringDialog} onOpenChange={setShowRecurringDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Repeat className="w-4 h-4 mr-2" />
                Set Recurring
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Set Recurring Availability</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="flex flex-wrap gap-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                    <Button
                      key={day}
                      variant={recurringDays.includes(index) ? "default" : "outline"}
                      onClick={() => {
                        setRecurringDays(prev =>
                          prev.includes(index)
                            ? prev.filter(d => d !== index)
                            : [...prev, index]
                        );
                      }}
                    >
                      {day}
                    </Button>
                  ))}
                </div>
                <Button
                  onClick={applyRecurring}
                  disabled={recurringDays.length === 0}
                  className="w-full"
                >
                  Apply to Next 4 Weeks
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <div className="flex space-x-2">
            <Button variant="outline" onClick={exportAvailability}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <div className="relative">
              <input
                type="file"
                accept=".json"
                onChange={importAvailability}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                aria-label="Import availability settings"
              />
              <Button variant="outline">
                <Upload className="w-4 h-4 mr-2" />
                Import
              </Button>
            </div>
          </div>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                Manage Services
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Manage Services</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="flex justify-end">
                  <Button
                    onClick={() => {
                      setEditingService(null);
                      setNewService({
                        name: '',
                        duration: 60,
                        description: '',
                        price: 0
                      });
                      setShowServiceDialog(true);
                    }}
                  >
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Add Service
                  </Button>
                </div>
                <div className="space-y-4">
                  {services.map((service) => (
                    <Card key={service.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h3 className="font-medium">{service.name}</h3>
                          <p className="text-sm text-gray-500">{service.description}</p>
                          <div className="flex space-x-4 text-sm">
                            <span>{service.duration} minutes</span>
                            <span>${service.price}</span>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingService(service);
                              setNewService(service);
                              setShowServiceDialog(true);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => deleteService(service.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Calendar */}
        <Card className="p-6">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            className="rounded-md border"
          />
          <div className="mt-4 flex items-center space-x-2 text-sm text-gray-500">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-violet-200 rounded-full mr-1" />
              <span>Has Availability</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-gray-200 rounded-full mr-1" />
              <span>No Slots</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-200 rounded-full mr-1" />
              <span>Has Appointments</span>
            </div>
          </div>
        </Card>

        {/* Time Slots */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">
                Time Slots for {format(new Date(selectedDay), 'MMMM d, yyyy')}
              </h2>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTimeline(!showTimeline)}
                >
                  {showTimeline ? 'Show List' : 'Show Timeline'}
                </Button>
              </div>
            </div>
            <Button onClick={addTimeSlot}>
              <Plus className="w-4 h-4 mr-2" />
              Add Time Slot
            </Button>
          </div>

          {showTimeline ? (
            renderTimeline()
          ) : (
            <div className="space-y-4">
              {availability[selectedDay]?.map((slot, index) => (
                <div key={index} className="flex flex-col space-y-4 p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="flex-1 grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Start Time</Label>
                        <Select
                          value={slot.startTime}
                          onValueChange={(value) => updateTimeSlot(index, 'startTime', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select start time" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 48 }, (_, i) => {
                              const hour = Math.floor(i / 2);
                              const minute = i % 2 === 0 ? '00' : '30';
                              const time = `${String(hour).padStart(2, '0')}:${minute}`;
                              return (
                                <SelectItem key={i} value={time}>
                                  {time}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>End Time</Label>
                        <Select
                          value={slot.endTime}
                          onValueChange={(value) => updateTimeSlot(index, 'endTime', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select end time" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 48 }, (_, i) => {
                              const hour = Math.floor(i / 2);
                              const minute = i % 2 === 0 ? '00' : '30';
                              const time = `${String(hour).padStart(2, '0')}:${minute}`;
                              return (
                                <SelectItem key={i} value={time}>
                                  {time}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={slot.isAvailable}
                          onCheckedChange={(checked) => updateTimeSlot(index, 'isAvailable', checked)}
                        />
                        <Label>Available</Label>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTimeSlot(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>

                  {/* Services Selection */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Available Services</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Services
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="p-0" align="end">
                          <Command>
                            <CommandInput placeholder="Search services..." />
                            <CommandEmpty>No services found.</CommandEmpty>
                            <CommandGroup>
                              {services.map((service) => {
                                const isSelected = slot.services?.includes(service.id);
                                return (
                                  <CommandItem
                                    key={service.id}
                                    onSelect={() => {
                                      const updatedServices = isSelected
                                        ? slot.services.filter(id => id !== service.id)
                                        : [...(slot.services || []), service.id];
                                      updateTimeSlot(index, 'services', updatedServices);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        isSelected ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <div className="flex-1">
                                      <div className="font-medium">{service.name}</div>
                                      <div className="text-sm text-gray-500">
                                        {service.duration} mins - ${service.price}
                                      </div>
                                    </div>
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {slot.services?.map((serviceId) => {
                        const service = services.find(s => s.id === serviceId);
                        if (!service) return null;
                        return (
                          <Badge
                            key={service.id}
                            variant="secondary"
                            className="flex items-center space-x-1"
                          >
                            <span>{service.name}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-4 w-4 p-0 hover:bg-transparent"
                              onClick={() => {
                                const updatedServices = slot.services.filter(id => id !== service.id);
                                updateTimeSlot(index, 'services', updatedServices);
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        );
                      })}
                      {(!slot.services || slot.services.length === 0) && (
                        <div className="text-sm text-gray-500">
                          No services selected for this time slot
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {(!availability[selectedDay] || availability[selectedDay].length === 0) && (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No time slots added for this day</p>
                  <p className="text-sm">Click "Add Time Slot" to set your availability</p>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Save Template Dialog */}
      <Dialog open={showSaveTemplateDialog} onOpenChange={setShowSaveTemplateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Template Name</Label>
              <Input
                placeholder="Enter template name"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveTemplateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={saveAsTemplate}>Save Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Edit Dialog */}
      <Dialog open={showBulkEditDialog} onOpenChange={setShowBulkEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bulk Edit Availability</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Label>Select dates to apply current time slots</Label>
            <Calendar
              mode="multiple"
              selected={bulkEditDates}
              onSelect={setBulkEditDates as any}
              className="rounded-md border"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkEditDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={applyBulkEdit}
              disabled={bulkEditDates.length === 0}
            >
              Apply to Selected Dates
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Service Dialog */}
      <Dialog open={showServiceDialog} onOpenChange={setShowServiceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingService ? 'Edit Service' : 'Add New Service'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Service Name</Label>
              <Input
                placeholder="Enter service name"
                value={newService.name}
                onChange={(e) => setNewService(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Duration (minutes)</Label>
              <Select
                value={newService.duration?.toString()}
                onValueChange={(value) => setNewService(prev => ({ ...prev, duration: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  {[15, 30, 45, 60, 90, 120].map((duration) => (
                    <SelectItem key={duration} value={duration.toString()}>
                      {duration} minutes
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                placeholder="Enter service description"
                value={newService.description}
                onChange={(e) => setNewService(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Price ($)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="Enter price"
                value={newService.price}
                onChange={(e) => setNewService(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowServiceDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleServiceSubmit}>
              {editingService ? 'Update' : 'Add'} Service
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 