import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Lottie from 'lottie-react';
import { triggerHaptic } from '@/lib/haptic';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Simple calendar animation data
const calendarAnimation = {
  v: "5.7.4",
  fr: 60,
  ip: 0,
  op: 60,
  w: 100,
  h: 100,
  nm: "Calendar",
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: "Calendar",
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: { a: 1, k: [{ t: 0, s: [0], e: [360] }, { t: 60 }] },
        p: { a: 0, k: [50, 50, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 1, k: [{ t: 0, s: [80, 80, 100], e: [100, 100, 100] }, { t: 30 }] }
      },
      ao: 0,
      shapes: [
        {
          ty: "gr",
          it: [
            {
              ty: "rc",
              d: 1,
              s: { a: 0, k: [60, 60] },
              p: { a: 0, k: [0, 0] },
              r: { a: 0, k: 8 }
            },
            {
              ty: "fl",
              c: { a: 0, k: [0.93, 0.29, 0.73, 1] },
              o: { a: 0, k: 100 }
            }
          ]
        }
      ]
    }
  ]
};

interface ModernBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  services: any[];
  professionalId: string;
  professionalName: string;
  onSubmit: (data: BookingFormData) => void;
}

export interface BookingFormData {
  serviceId: string;
  staffMemberId?: string;
  firstName: string;
  lastName: string;
  phone: string;
  date: Date;
  time: string;
  notes?: string;
}

const ModernBookingModal = ({ isOpen, onClose, services, professionalId, professionalName, onSubmit }: ModernBookingModalProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [formData, setFormData] = useState<Partial<BookingFormData>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [timeSlots, setTimeSlots] = useState<Array<{ time: string; isBooked: boolean }>>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [availableStaff, setAvailableStaff] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsVisible(true);
        });
      });
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  // Load available services when date changes
  useEffect(() => {
    if (formData.date) {
      loadAvailableServices(formData.date);
    } else {
      setAvailableServices([]);
    }
  }, [formData.date, services]);

  // Load available staff when service is selected
  useEffect(() => {
    if (formData.serviceId) {
      loadAvailableStaff();
    }
  }, [formData.serviceId]);

  // Load available time slots when service, staff, and date are selected
  useEffect(() => {
    if (formData.date && formData.serviceId && formData.staffMemberId) {
      const selectedService = services.find(s => s.id === formData.serviceId);
      if (selectedService) {
        loadAvailableTimeSlots(professionalId, formData.date, selectedService, formData.staffMemberId);
      }
    } else {
      setTimeSlots([]);
    }
  }, [formData.date, formData.serviceId, formData.staffMemberId, professionalId, services]);

  // Realtime subscription for bookings changes
  useEffect(() => {
    if (!formData.date || !formData.serviceId || !professionalId) return;

    const selectedService = services.find(s => s.id === formData.serviceId);
    if (!selectedService) return;

    console.log('Setting up realtime subscription for professional:', professionalId);

    // Subscribe to bookings changes
    const channel = supabase
      .channel('bookings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `professional_id=eq.${professionalId}`
        },
        (payload) => {
          console.log('Booking changed via realtime:', payload);
          // Reload time slots when any booking changes for this professional
          if (formData.date && formData.serviceId && formData.staffMemberId) {
            loadAvailableTimeSlots(professionalId, formData.date, selectedService, formData.staffMemberId);
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    return () => {
      console.log('Removing realtime channel');
      supabase.removeChannel(channel);
    };
  }, [formData.date, formData.serviceId, formData.staffMemberId, professionalId]);

  const loadAvailableServices = async (date: Date) => {
    try {
      const dayOfWeek = date.getDay();

      // Fetch schedules for this day to get available_services
      const { data: schedules, error } = await supabase
        .from('professional_schedules')
        .select('available_services')
        .eq('professional_id', professionalId)
        .eq('day_of_week', dayOfWeek)
        .eq('is_active', true);

      if (error) throw error;

      // Collect all available service IDs for this day
      const serviceIds = new Set<string>();
      schedules?.forEach(schedule => {
        (schedule.available_services || []).forEach((id: string) => serviceIds.add(id));
      });

      // Filter services that are available on this day
      const filtered = services.filter(s => serviceIds.has(s.id));
      setAvailableServices(filtered);

      // If currently selected service is not available, clear it
      if (formData.serviceId && !serviceIds.has(formData.serviceId)) {
        setFormData(prev => ({ ...prev, serviceId: undefined, time: undefined }));
      }
    } catch (error) {
      console.error('Error loading available services:', error);
      setAvailableServices([]);
    }
  };

  const loadAvailableStaff = async () => {
    try {
      if (!formData.serviceId) return;

      // Get the service to check if it's assigned to a specific staff member
      const { data: serviceData, error: serviceError } = await supabase
        .from('services')
        .select('staff_member_id')
        .eq('id', formData.serviceId)
        .single();

      if (serviceError) throw serviceError;

      if (serviceData.staff_member_id) {
        // Service is assigned to a specific staff member
        const { data: staffData, error: staffError } = await supabase
          .from('staff_members')
          .select('*')
          .eq('id', serviceData.staff_member_id)
          .eq('is_active', true)
          .single();

        if (staffError) throw staffError;
        
        if (staffData) {
          setAvailableStaff([staffData]);
          setFormData(prev => ({ ...prev, staffMemberId: staffData.id }));
        }
      } else {
        // Service is not assigned to any specific staff, show all staff from this professional
        const { data: allStaff, error: staffError } = await supabase
          .from('staff_members')
          .select('*')
          .eq('professional_id', professionalId)
          .eq('is_active', true);

        if (staffError) throw staffError;
        
        setAvailableStaff(allStaff || []);
        
        // Auto-select if only one staff member or no staff (direct booking)
        if (allStaff && allStaff.length === 1) {
          setFormData(prev => ({ ...prev, staffMemberId: allStaff[0].id }));
        } else if (!allStaff || allStaff.length === 0) {
          // No staff members, allow direct booking to professional
          setFormData(prev => ({ ...prev, staffMemberId: undefined }));
        }
      }
    } catch (error) {
      console.error('Error loading available staff:', error);
      setAvailableStaff([]);
    }
  };

  const loadAvailableTimeSlots = async (professionalId: string, date: Date, service: any, staffMemberId?: string) => {
    setLoadingSlots(true);
    console.log('Loading available time slots for:', professionalId, date);
    try {
      const dayOfWeek = date.getDay();
      const dateStr = date.toISOString().split('T')[0];

      // Fetch professional's schedule for this day that includes this service
      let scheduleQuery = supabase
        .from('professional_schedules')
        .select('*')
        .eq('professional_id', professionalId)
        .eq('day_of_week', dayOfWeek)
        .eq('is_active', true);

      // Filter by staff member if provided
      if (staffMemberId) {
        scheduleQuery = scheduleQuery.eq('staff_member_id', staffMemberId);
      } else {
        scheduleQuery = scheduleQuery.is('staff_member_id', null);
      }

      const { data: schedules, error: scheduleError } = await scheduleQuery;

      // Filter schedules that include this service
      const filteredSchedules = (schedules || []).filter(schedule =>
        (schedule.available_services || []).includes(service.id)
      );

      console.log('Schedules loaded:', filteredSchedules);
      if (scheduleError) throw scheduleError;

      if (!filteredSchedules || filteredSchedules.length === 0) {
        console.log('No schedules found for this day with this service');
        setTimeSlots([]);
        return;
      }

      // Get service duration (default 60 minutes if not set)
      const serviceDuration = service.duration || 60;

      // Fetch existing bookings for this date with start and end times
      let bookingsQuery = supabase
        .from('bookings')
        .select('booking_time, booking_end_time')
        .eq('professional_id', professionalId)
        .eq('booking_date', dateStr)
        .in('status', ['pending', 'confirmed']);

      // Filter by staff member if provided
      if (staffMemberId) {
        bookingsQuery = bookingsQuery.eq('staff_member_id', staffMemberId);
      } else {
        bookingsQuery = bookingsQuery.is('staff_member_id', null);
      }

      const { data: bookings, error: bookingsError } = await bookingsQuery;

      console.log('Bookings loaded for date:', dateStr, bookings);
      if (bookingsError) throw bookingsError;

      // Create array of booked time ranges
      const bookedRanges = (bookings || []).map(b => {
        const startTime = b.booking_time.substring(0, 5); // HH:MM
        const endTime = b.booking_end_time.substring(0, 5); // HH:MM
        return { start: startTime, end: endTime };
      });
      console.log('Booked time ranges:', bookedRanges);

      // Helper function to convert time string to minutes
      const timeToMinutes = (time: string): number => {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
      };

      // Helper function to check if a time range overlaps with any booked range
      const hasOverlap = (slotStart: string, slotEnd: string): boolean => {
        const slotStartMin = timeToMinutes(slotStart);
        const slotEndMin = timeToMinutes(slotEnd);
        
        return bookedRanges.some(range => {
          const rangeStartMin = timeToMinutes(range.start);
          const rangeEndMin = timeToMinutes(range.end);
          
          // Check if ranges overlap
          return (
            (slotStartMin >= rangeStartMin && slotStartMin < rangeEndMin) ||
            (slotEndMin > rangeStartMin && slotEndMin <= rangeEndMin) ||
            (slotStartMin <= rangeStartMin && slotEndMin >= rangeEndMin)
          );
        });
      };

      // Generate ALL time slots (both available and booked) with status
      const slots: Array<{ time: string; isBooked: boolean }> = [];
      filteredSchedules.forEach(schedule => {
        const startHour = parseInt(schedule.start_time.split(':')[0]);
        const startMinute = parseInt(schedule.start_time.split(':')[1]);
        const endHour = parseInt(schedule.end_time.split(':')[0]);
        const endMinute = parseInt(schedule.end_time.split(':')[1]);
        const interval = schedule.time_slot_interval || 30;

        let currentHour = startHour;
        let currentMinute = startMinute;

        while (
          currentHour < endHour || 
          (currentHour === endHour && currentMinute < endMinute)
        ) {
          const timeSlot = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
          
          // Calculate end time for this slot based on service duration
          let slotEndMinute = currentMinute + serviceDuration;
          let slotEndHour = currentHour;
          if (slotEndMinute >= 60) {
            slotEndHour += Math.floor(slotEndMinute / 60);
            slotEndMinute = slotEndMinute % 60;
          }
          const slotEndTime = `${String(slotEndHour).padStart(2, '0')}:${String(slotEndMinute).padStart(2, '0')}`;

          // Check if service fits within schedule end time
          const slotEndTimeMin = slotEndHour * 60 + slotEndMinute;
          const scheduleEndTimeMin = endHour * 60 + endMinute;
          const serviceFits = slotEndTimeMin <= scheduleEndTimeMin;

          // Check if this slot overlaps with any booked time range
          const isBooked = serviceFits && hasOverlap(timeSlot, slotEndTime);

          // Only add slot if service fits
          if (serviceFits) {
            slots.push({
              time: timeSlot,
              isBooked: isBooked
            });
          }

          // Increment by time slot interval
          currentMinute += interval;
          if (currentMinute >= 60) {
            currentHour += Math.floor(currentMinute / 60);
            currentMinute = currentMinute % 60;
          }
        }
      });

      console.log('All time slots with status:', slots);
      setTimeSlots(slots.sort((a, b) => a.time.localeCompare(b.time)));
    } catch (error) {
      console.error('Error loading time slots:', error);
      toast.error('Neizdevās ielādēt pieejamos laikus');
      setTimeSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  if (!isOpen) return null;

  const handleClose = () => {
    triggerHaptic('light');
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.serviceId) {
      newErrors.service = 'Pakalpojums ir obligāts';
    }
    if (!formData.firstName?.trim()) {
      newErrors.firstName = 'Vārds ir obligāts';
    }
    if (!formData.lastName?.trim()) {
      newErrors.lastName = 'Uzvārds ir obligāts';
    }
    if (!formData.phone?.trim()) {
      newErrors.phone = 'Telefona numurs ir obligāts';
    } else if (!/^\+?[\d\s-]{8,}$/.test(formData.phone)) {
      newErrors.phone = 'Nederīgs telefona numurs';
    }
    if (!formData.date) {
      newErrors.date = 'Datums ir obligāts';
    }
    if (!formData.time) {
      newErrors.time = 'Laiks ir obligāts';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      triggerHaptic('medium');
      onSubmit(formData as BookingFormData);
    } else {
      triggerHaptic('heavy');
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ zIndex: 10000 }}
        onClick={handleClose}
      />

      {/* Bottom Sheet */}
      <div
        className={`fixed left-0 right-0 bottom-0 bg-white rounded-t-[32px] shadow-2xl transition-all duration-500 ease-out ${
          isVisible ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{
          zIndex: 10001,
          maxHeight: '90vh',
          paddingBottom: 'max(env(safe-area-inset-bottom), 20px)',
        }}
      >
        {/* Grabber */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition-all z-10"
          aria-label="Aizvērt"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>

        {/* Lottie Animation */}
        <div className="flex justify-center mb-2">
          <div className="w-20 h-20">
            <Lottie animationData={calendarAnimation} loop={false} />
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 120px)' }}>
          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Pieteikt vizīti</h2>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
              <span className="font-semibold">{professionalName}</span>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-5">
            {/* Date Picker */}
            <div>
              <Label className="text-sm font-semibold text-gray-700 mb-2 block">
                Izvēlies datumu <span className="text-red-500">*</span>
              </Label>
              <div className="border-2 border-gray-200 rounded-2xl p-4 bg-gray-50">
                <Calendar
                  mode="single"
                  selected={formData.date}
                  onSelect={(date) => setFormData({ ...formData, date, serviceId: undefined, time: undefined })}
                  disabled={(date) => date < new Date()}
                  className={cn("rounded-xl pointer-events-auto")}
                />
              </div>
              {errors.date && (
                <p className="text-xs text-red-500 mt-1">{errors.date}</p>
              )}
            </div>

            {/* Service Selection */}
            {formData.date && (
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Izvēlies pakalpojumu <span className="text-red-500">*</span>
                </Label>
                {availableServices.length === 0 ? (
                  <div className="text-sm text-amber-600 text-center py-4 bg-amber-50 rounded-xl">
                    Šajā dienā nav pieejami pakalpojumi
                  </div>
                ) : (
                  <div className="grid gap-2">
                    {availableServices.map((svc) => (
                      <button
                        key={svc.id}
                        type="button"
                        onClick={() => {
                          triggerHaptic('light');
                          setFormData({ ...formData, serviceId: svc.id, staffMemberId: undefined, time: undefined });
                        }}
                        className={cn(
                          "p-4 rounded-xl border-2 text-left transition-all",
                          formData.serviceId === svc.id
                            ? "border-primary bg-primary/5"
                            : "border-gray-200 hover:border-gray-300"
                        )}
                      >
                        <div className="font-semibold text-gray-900">{svc.name}</div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                          <span>💶 €{svc.price}</span>
                          <span>•</span>
                          <span>⏱️ {svc.duration} min</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {errors.service && (
                  <p className="text-xs text-red-500 mt-1">{errors.service}</p>
                )}
              </div>
            )}

            {/* Staff Member Selection */}
            {formData.serviceId && availableStaff.length > 1 && (
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Izvēlieties meistaru <span className="text-red-500">*</span>
                </Label>
                <div className="grid gap-2">
                  {availableStaff.map((staff) => (
                    <button
                      key={staff.id}
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        setFormData({ ...formData, staffMemberId: staff.id, time: undefined });
                      }}
                      className={cn(
                        "p-4 rounded-xl border-2 text-left transition-all",
                        formData.staffMemberId === staff.id
                          ? "border-primary bg-primary/5"
                          : "border-gray-200 hover:border-gray-300"
                      )}
                    >
                      <div className="font-semibold text-gray-900">{staff.name}</div>
                      {staff.position && (
                        <div className="text-sm text-gray-500 mt-1">{staff.position}</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Time Selection */}
            {formData.date && formData.serviceId && (formData.staffMemberId || availableStaff.length <= 1) && timeSlots.length > 0 && (
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Izvēlies laiku <span className="text-red-500">*</span>
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {timeSlots.map((slot) => (
                    <button
                      key={slot.time}
                      type="button"
                      disabled={slot.isBooked}
                      onClick={() => {
                        if (!slot.isBooked) {
                          triggerHaptic('light');
                          setFormData({ ...formData, time: slot.time });
                        }
                      }}
                      className={cn(
                        "p-3 rounded-xl border-2 text-sm font-medium transition-all",
                        slot.isBooked
                          ? "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
                          : formData.time === slot.time
                          ? "border-primary bg-primary text-white"
                          : "border-gray-200 hover:border-gray-300"
                      )}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
                {errors.time && (
                  <p className="text-xs text-red-500 mt-1">{errors.time}</p>
                )}
              </div>
            )}

            {formData.date && formData.serviceId && (formData.staffMemberId || availableStaff.length <= 1) && timeSlots.length === 0 && !loadingSlots && (
              <div className="text-sm text-amber-600 text-center py-4 bg-amber-50 rounded-xl">
                Šajā dienā nav pieejamu laiku
              </div>
            )}

            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="firstName" className="text-sm font-semibold text-gray-700 mb-1.5 block">
                  Vārds <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="firstName"
                  value={formData.firstName || ''}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className={cn(
                    "h-12 rounded-xl border-2",
                    errors.firstName ? "border-red-500" : "border-gray-200"
                  )}
                  placeholder="Jānis"
                />
                {errors.firstName && (
                  <p className="text-xs text-red-500 mt-1">{errors.firstName}</p>
                )}
              </div>
              <div>
                <Label htmlFor="lastName" className="text-sm font-semibold text-gray-700 mb-1.5 block">
                  Uzvārds <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="lastName"
                  value={formData.lastName || ''}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className={cn(
                    "h-12 rounded-xl border-2",
                    errors.lastName ? "border-red-500" : "border-gray-200"
                  )}
                  placeholder="Bērziņš"
                />
                {errors.lastName && (
                  <p className="text-xs text-red-500 mt-1">{errors.lastName}</p>
                )}
              </div>
            </div>

            {/* Phone */}
            <div>
              <Label htmlFor="phone" className="text-sm font-semibold text-gray-700 mb-1.5 block">
                Telefona numurs <span className="text-red-500">*</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className={cn(
                  "h-12 rounded-xl border-2",
                  errors.phone ? "border-red-500" : "border-gray-200"
                )}
                placeholder="+371 20 000 000"
              />
              {errors.phone && (
                <p className="text-xs text-red-500 mt-1">{errors.phone}</p>
              )}
            </div>

            {/* Time Slots */}
            {formData.date && formData.serviceId && (
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Izvēlies laiku <span className="text-red-500">*</span>
                </Label>
                {loadingSlots ? (
                  <div className="text-center py-8 text-gray-500">
                    Ielādē pieejamos laikus...
                  </div>
                ) : timeSlots.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Šajā dienā nav pieejamu laiku
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {timeSlots.map((slot) => (
                      <button
                        key={slot.time}
                        onClick={() => {
                          if (!slot.isBooked) {
                            triggerHaptic('light');
                            setFormData({ ...formData, time: slot.time });
                          }
                        }}
                        disabled={slot.isBooked}
                        className={cn(
                          "py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200",
                          slot.isBooked
                            ? "bg-gray-200 text-gray-400 cursor-not-allowed line-through opacity-60"
                            : formData.time === slot.time
                            ? "bg-gradient-to-r from-primary to-secondary text-white shadow-lg active:scale-95"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200 active:scale-95"
                        )}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                )}
                {errors.time && (
                  <p className="text-xs text-red-500 mt-1">{errors.time}</p>
                )}
              </div>
            )}

            {/* Notes */}
            <div>
              <Label htmlFor="notes" className="text-sm font-semibold text-gray-700 mb-1.5 block">
                Piezīmes (neobligāti)
              </Label>
              <Textarea
                id="notes"
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="rounded-xl border-2 border-gray-200 resize-none"
                placeholder="Jutīga āda, alerģijas u.c."
                rows={3}
              />
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={!formData.date || !formData.time}
              className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-200 active:scale-[0.98] bg-gradient-to-r from-primary via-primary to-secondary"
            >
              Apstiprināt rezervāciju
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ModernBookingModal;
