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
  initialServiceId?: string | null;
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

const ModernBookingModal = ({ isOpen, onClose, services, professionalId, professionalName, onSubmit, initialServiceId }: ModernBookingModalProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [formData, setFormData] = useState<Partial<BookingFormData>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [availableStaff, setAvailableStaff] = useState<any[]>([]);
  const [staffTimeSlots, setStaffTimeSlots] = useState<Record<string, Array<{ time: string; isBooked: boolean; serviceId: string; serviceName: string }>>>({});

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsVisible(true);
        });
      });
      // Set initial service if provided
      if (initialServiceId) {
        setFormData(prev => ({ ...prev, serviceId: initialServiceId }));
      }
    } else {
      setIsVisible(false);
      // Reset form when modal closes
      setFormData({});
    }
  }, [isOpen, initialServiceId]);

  // Load available staff and their time slots when date or service changes
  useEffect(() => {
    if (formData.date) {
      loadStaffAndTimeSlots(formData.date);
    } else {
      setAvailableStaff([]);
      setStaffTimeSlots({});
    }
  }, [formData.date, formData.serviceId, services, professionalId]);

  // Realtime subscription for bookings changes
  useEffect(() => {
    if (!formData.date || !professionalId) return;

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
          // Reload staff time slots when any booking changes
          if (formData.date) {
            loadStaffAndTimeSlots(formData.date);
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
  }, [formData.date, professionalId]);

  const loadStaffAndTimeSlots = async (date: Date) => {
    setLoadingSlots(true);
    try {
      const dayOfWeek = date.getDay();
      const dateStr = date.toISOString().split('T')[0];

      // CRITICAL: Must have a service selected to show staff
      if (!formData.serviceId) {
        setAvailableStaff([]);
        setStaffTimeSlots({});
        setLoadingSlots(false);
        return;
      }

      // Step 1: Get the selected service details
      const selectedService = services.find(s => s.id === formData.serviceId);
      if (!selectedService) {
        setAvailableStaff([]);
        setStaffTimeSlots({});
        setLoadingSlots(false);
        return;
      }

      const serviceDuration = selectedService.duration || 60;

      // Step 2: Get staff members assigned to this specific service via master_services
      const { data: masterServices, error: msError } = await supabase
        .from('master_services')
        .select('staff_member_id')
        .eq('service_id', formData.serviceId);

      if (msError) throw msError;

      const staffIds = masterServices?.map(ms => ms.staff_member_id) || [];

      if (staffIds.length === 0) {
        setAvailableStaff([]);
        setStaffTimeSlots({});
        setLoadingSlots(false);
        return;
      }

      // Step 3: Get the actual staff member details (only active ones for this professional)
      const { data: allStaff, error: staffError } = await supabase
        .from('staff_members')
        .select('*')
        .in('id', staffIds)
        .eq('professional_id', professionalId)
        .eq('is_active', true);

      if (staffError) throw staffError;

      if (!allStaff || allStaff.length === 0) {
        setAvailableStaff([]);
        setStaffTimeSlots({});
        setLoadingSlots(false);
        return;
      }

      // Step 4: For each staff member, check if they have schedules for this day with this service
      const staffWithSchedules: any[] = [];
      const staffSlotsMap: Record<string, Array<{ time: string; isBooked: boolean; serviceId: string; serviceName: string }>> = {};

      for (const staffMember of allStaff) {
        // Fetch schedules for this staff member on this day
        const { data: schedules, error: scheduleError } = await supabase
          .from('professional_schedules')
          .select('*')
          .eq('professional_id', professionalId)
          .eq('staff_member_id', staffMember.id)
          .eq('day_of_week', dayOfWeek)
          .eq('is_active', true);

        if (scheduleError) {
          console.error('Error loading schedules:', scheduleError);
          continue;
        }

        // Filter schedules that include this specific service
        const relevantSchedules = (schedules || []).filter(schedule =>
          (schedule.available_services || []).includes(formData.serviceId)
        );

        if (relevantSchedules.length === 0) continue;

        // Fetch existing bookings for this staff member on this date
        const { data: bookings, error: bookingsError } = await supabase
          .from('bookings')
          .select('booking_time, booking_end_time')
          .eq('professional_id', professionalId)
          .eq('staff_member_id', staffMember.id)
          .eq('booking_date', dateStr)
          .in('status', ['pending', 'confirmed']);

        if (bookingsError) {
          console.error('Error loading bookings:', bookingsError);
          continue;
        }

        // Create booked time ranges
        const bookedRanges = (bookings || []).map(b => ({
          start: b.booking_time.substring(0, 5),
          end: b.booking_end_time.substring(0, 5)
        }));

        const timeToMinutes = (time: string): number => {
          const [hours, minutes] = time.split(':').map(Number);
          return hours * 60 + minutes;
        };

        const hasOverlap = (slotStart: string, slotEnd: string): boolean => {
          const slotStartMin = timeToMinutes(slotStart);
          const slotEndMin = timeToMinutes(slotEnd);
          
          return bookedRanges.some(range => {
            const rangeStartMin = timeToMinutes(range.start);
            const rangeEndMin = timeToMinutes(range.end);
            
            return (
              (slotStartMin >= rangeStartMin && slotStartMin < rangeEndMin) ||
              (slotEndMin > rangeStartMin && slotEndMin <= rangeEndMin) ||
              (slotStartMin <= rangeStartMin && slotEndMin >= rangeEndMin)
            );
          });
        };

        // Generate time slots based on the service duration
        const slots: Array<{ time: string; isBooked: boolean; serviceId: string; serviceName: string }> = [];
        
        for (const schedule of relevantSchedules) {
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
            
            // Calculate end time based on service duration
            let slotEndMinute = currentMinute + serviceDuration;
            let slotEndHour = currentHour;
            if (slotEndMinute >= 60) {
              slotEndHour += Math.floor(slotEndMinute / 60);
              slotEndMinute = slotEndMinute % 60;
            }
            const slotEndTime = `${String(slotEndHour).padStart(2, '0')}:${String(slotEndMinute).padStart(2, '0')}`;

            // Check if service fits within schedule
            const slotEndTimeMin = slotEndHour * 60 + slotEndMinute;
            const scheduleEndTimeMin = endHour * 60 + endMinute;
            const serviceFits = slotEndTimeMin <= scheduleEndTimeMin;

            if (serviceFits) {
              const isBooked = hasOverlap(timeSlot, slotEndTime);
              
              // Avoid duplicates
              const existingSlot = slots.find(s => s.time === timeSlot);
              if (!existingSlot) {
                slots.push({
                  time: timeSlot,
                  isBooked,
                  serviceId: selectedService.id,
                  serviceName: selectedService.name
                });
              }
            }

            // Move to next interval
            currentMinute += interval;
            if (currentMinute >= 60) {
              currentHour += Math.floor(currentMinute / 60);
              currentMinute = currentMinute % 60;
            }
          }
        }

        // Only include staff if they have at least one time slot
        if (slots.length > 0) {
          staffWithSchedules.push(staffMember);
          staffSlotsMap[staffMember.id] = slots.sort((a, b) => a.time.localeCompare(b.time));
        }
      }

      setAvailableStaff(staffWithSchedules);
      setStaffTimeSlots(staffSlotsMap);
    } catch (error) {
      console.error('Error loading staff and time slots:', error);
      toast.error('Neizdevās ielādēt pieejamos laikus');
      setAvailableStaff([]);
      setStaffTimeSlots({});
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
                  onSelect={(date) => setFormData({ ...formData, date, time: undefined, staffMemberId: undefined })}
                  disabled={(date) => date < new Date()}
                  className={cn("rounded-xl pointer-events-auto")}
                />
              </div>
              {errors.date && (
                <p className="text-xs text-red-500 mt-1">{errors.date}</p>
              )}
            </div>

            {/* Staff Members and Time Slots */}
            {formData.date && (
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-3 block">
                  Pieejamie meistari un laiki
                </Label>
                {loadingSlots ? (
                  <div className="text-center py-8 text-gray-500">
                    Ielādē pieejamos laikus...
                  </div>
                ) : availableStaff.length === 0 ? (
                  <div className="text-sm text-amber-600 text-center py-4 bg-amber-50 rounded-xl">
                    Nav pieejamu meistaru šim pakalpojumam vai datumam
                  </div>
                ) : (
                  <div className="space-y-4">
                    {availableStaff.map((staff) => {
                      const slots = staffTimeSlots[staff.id] || [];
                      const availableSlots = slots.filter(s => !s.isBooked);

                      return (
                        <div key={staff.id} className="border-2 border-gray-200 rounded-2xl p-4 bg-gray-50">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-lg">
                              {staff.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900">{staff.name}</div>
                              {staff.position && (
                                <div className="text-sm text-gray-500">{staff.position}</div>
                              )}
                            </div>
                          </div>
                          {availableSlots.length === 0 ? (
                            <div className="text-sm text-center py-3 text-gray-500 bg-gray-100 rounded-xl">
                              Nav pieejamu laiku
                            </div>
                          ) : (
                            <div className="grid grid-cols-3 gap-2">
                              {availableSlots.map((slot) => (
                                <button
                                  key={`${staff.id}-${slot.time}`}
                                  type="button"
                                  onClick={() => {
                                    triggerHaptic('light');
                                    setFormData({ 
                                      ...formData, 
                                      staffMemberId: staff.id, 
                                      serviceId: slot.serviceId,
                                      time: slot.time 
                                    });
                                  }}
                                  className={cn(
                                    "p-3 rounded-xl border-2 text-sm font-medium transition-all",
                                    formData.time === slot.time && formData.staffMemberId === staff.id
                                      ? "border-primary bg-primary text-white"
                                      : "border-gray-200 bg-white hover:border-primary/50"
                                  )}
                                >
                                  {slot.time}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
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
