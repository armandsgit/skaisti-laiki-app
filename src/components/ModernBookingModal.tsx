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
import { getPlanFeatures } from '@/lib/plan-features';
import { addDays } from 'date-fns';

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
  professionalPlan?: string | null;
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

const ModernBookingModal = ({ isOpen, onClose, services, professionalId, professionalName, professionalPlan, onSubmit, initialServiceId }: ModernBookingModalProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [formData, setFormData] = useState<Partial<BookingFormData>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableStaff, setAvailableStaff] = useState<any[]>([]);
  const [staffTimeSlots, setStaffTimeSlots] = useState<Record<string, Array<{ time: string; isBooked: boolean; serviceId: string; serviceName: string }>>>({});
  const [scheduleExceptions, setScheduleExceptions] = useState<Array<{ exception_date: string; is_closed: boolean; time_ranges: any; staff_member_id?: string }>>([]);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [availableDays, setAvailableDays] = useState<Set<string>>(new Set());

  // Calculate max date based on professional's plan - limit to max 1 month (31 days)
  const planFeatures = getPlanFeatures(professionalPlan);
  const maxDaysFromPlan = planFeatures.calendarDaysVisible === -1 
    ? 31 
    : Math.min(planFeatures.calendarDaysVisible, 31);
  const maxDate = addDays(new Date(), maxDaysFromPlan);

  // Load schedule exceptions and available days when modal opens or month changes
  useEffect(() => {
    if (isOpen && professionalId) {
      loadScheduleExceptions(currentMonth);
      if (formData.serviceId) {
        loadAvailableDays(currentMonth, formData.serviceId);
      }
    }
  }, [isOpen, professionalId, currentMonth]);

  // Reload available days when service changes
  useEffect(() => {
    if (isOpen && professionalId && formData.serviceId) {
      loadAvailableDays(currentMonth, formData.serviceId);
    } else {
      setAvailableDays(new Set());
    }
  }, [formData.serviceId, isOpen, professionalId]);

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsVisible(true);
        });
      });
      // Set initial service if provided - MUST happen immediately
      if (initialServiceId) {
        console.log('🔵 Setting initial serviceId:', initialServiceId);
        setFormData(prev => ({ ...prev, serviceId: initialServiceId }));
      }
    } else {
      setIsVisible(false);
      // Reset form when modal closes
      setFormData({});
      setAvailableStaff([]);
      setStaffTimeSlots({});
      setScheduleExceptions([]);
    }
  }, [isOpen, initialServiceId]);

  // Load available staff and their time slots when date or service changes
  useEffect(() => {
    if (formData.date && formData.serviceId) {
      console.log('🔵 Loading staff for date:', formData.date, 'serviceId:', formData.serviceId);
      loadStaffAndTimeSlots(formData.date);
    } else {
      console.log('🔵 Clearing staff - date:', formData.date, 'serviceId:', formData.serviceId);
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

  const loadScheduleExceptions = async (month: Date) => {
    try {
      const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
      const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0);
      
      const startDateStr = startOfMonth.toISOString().split('T')[0];
      const endDateStr = endOfMonth.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('schedule_exceptions')
        .select('exception_date, is_closed, time_ranges, staff_member_id')
        .eq('professional_id', professionalId)
        .gte('exception_date', startDateStr)
        .lte('exception_date', endDateStr);

      if (error) throw error;
      
      console.log('📅 Loaded schedule exceptions:', data);
      setScheduleExceptions(data || []);
    } catch (error) {
      console.error('❌ Error loading schedule exceptions:', error);
    }
  };

  // Load available days for the selected service in the visible month
  const loadAvailableDays = async (month: Date, serviceId: string) => {
    try {
      // Get the selected service details for duration
      const selectedService = services.find(s => s.id === serviceId);
      if (!selectedService) {
        setAvailableDays(new Set());
        return;
      }
      const serviceDuration = selectedService.duration || 60;

      // Get staff members assigned to this service
      const { data: masterServices, error: msError } = await supabase
        .from('master_services')
        .select('staff_member_id')
        .eq('service_id', serviceId);

      if (msError) throw msError;
      const staffIds = masterServices?.map(ms => ms.staff_member_id) || [];
      
      if (staffIds.length === 0) {
        setAvailableDays(new Set());
        return;
      }

      // Get active staff members for this professional
      const { data: staff, error: staffError } = await supabase
        .from('staff_members')
        .select('id')
        .in('id', staffIds)
        .eq('professional_id', professionalId)
        .eq('is_active', true);

      if (staffError) throw staffError;
      const activeStaffIds = staff?.map(s => s.id) || [];
      
      if (activeStaffIds.length === 0) {
        setAvailableDays(new Set());
        return;
      }

      // Get all schedules for these staff members that include this service
      const { data: schedules, error: scheduleError } = await supabase
        .from('professional_schedules')
        .select('day_of_week, staff_member_id, available_services, start_time, end_time')
        .eq('professional_id', professionalId)
        .in('staff_member_id', activeStaffIds)
        .eq('is_active', true);

      if (scheduleError) throw scheduleError;

      // Filter schedules that include this service
      const relevantSchedules = (schedules || []).filter(s => 
        (s.available_services || []).includes(serviceId)
      );

      // Get schedule exceptions for the month
      const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
      const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0);
      const startDateStr = startOfMonth.toISOString().split('T')[0];
      const endDateStr = endOfMonth.toISOString().split('T')[0];

      const { data: exceptions, error: exError } = await supabase
        .from('schedule_exceptions')
        .select('exception_date, is_closed, time_ranges, staff_member_id')
        .eq('professional_id', professionalId)
        .gte('exception_date', startDateStr)
        .lte('exception_date', endDateStr);

      if (exError) throw exError;

      // Get all bookings for the month
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('booking_date, booking_time, booking_end_time, staff_member_id')
        .eq('professional_id', professionalId)
        .in('staff_member_id', activeStaffIds)
        .gte('booking_date', startDateStr)
        .lte('booking_date', endDateStr)
        .in('status', ['pending', 'confirmed', 'completed']);

      if (bookingsError) throw bookingsError;

      // Helper functions
      const timeToMinutes = (time: string): number => {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
      };

      // Build set of available days
      const available = new Set<string>();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Get current time in Latvia
      const nowUTC = new Date();
      const nowLatviaStr = nowUTC.toLocaleString('sv-SE', { timeZone: 'Europe/Riga' });
      const [, timePartLatvia] = nowLatviaStr.split(' ');
      const [hourL, minuteL] = timePartLatvia.split(':').map(Number);
      const nowMinutesLatvia = hourL * 60 + minuteL;

      // Iterate through each day of the month
      for (let d = new Date(startOfMonth); d <= endOfMonth; d.setDate(d.getDate() + 1)) {
        if (d < today) continue;
        if (d > maxDate) continue;

        const year = d.getFullYear();
        const monthNum = String(d.getMonth() + 1).padStart(2, '0');
        const dayNum = String(d.getDate()).padStart(2, '0');
        const dateStr = `${year}-${monthNum}-${dayNum}`;
        const dayOfWeek = d.getDay();
        const isToday = d.getTime() === today.getTime();

        // Check exceptions for this date
        const dayExceptions = (exceptions || []).filter(e => e.exception_date === dateStr);
        
        // Get bookings for this date
        const dayBookings = (bookings || []).filter(b => b.booking_date === dateStr);

        // Check each staff member for availability
        let dayHasAvailability = false;

        for (const staffId of activeStaffIds) {
          const staffException = dayExceptions.find(e => e.staff_member_id === staffId);
          
          // If staff is closed, skip
          if (staffException?.is_closed) continue;

          // Get time ranges for this staff member on this day
          let timeRanges: Array<{ start: string; end: string }> = [];
          
          if (staffException && !staffException.is_closed && staffException.time_ranges) {
            // Use exception time ranges
            timeRanges = (staffException.time_ranges as any[]).map(r => ({
              start: r.start,
              end: r.end
            }));
          } else {
            // Use regular schedule
            const staffSchedules = relevantSchedules.filter(
              s => s.staff_member_id === staffId && s.day_of_week === dayOfWeek
            );
            timeRanges = staffSchedules.map(s => ({
              start: s.start_time.substring(0, 5),
              end: s.end_time.substring(0, 5)
            }));
          }

          if (timeRanges.length === 0) continue;

          // Get bookings for this staff member
          const staffBookings = dayBookings.filter(b => b.staff_member_id === staffId);
          const bookedRanges = staffBookings.map(b => ({
            start: timeToMinutes(b.booking_time.substring(0, 5)),
            end: timeToMinutes(b.booking_end_time.substring(0, 5))
          }));

          // Check if there's at least one free slot
          for (const range of timeRanges) {
            const rangeStartMin = timeToMinutes(range.start);
            const rangeEndMin = timeToMinutes(range.end);

            // Generate potential slots and check if any is free
            for (let slotStart = rangeStartMin; slotStart + serviceDuration <= rangeEndMin; slotStart += 10) {
              const slotEnd = slotStart + serviceDuration;

              // For today, skip past slots
              if (isToday && slotStart <= nowMinutesLatvia) continue;

              // Check if slot overlaps with any booking
              const isBooked = bookedRanges.some(
                booked => slotStart < booked.end && slotEnd > booked.start
              );

              if (!isBooked) {
                dayHasAvailability = true;
                break;
              }
            }
            if (dayHasAvailability) break;
          }
          if (dayHasAvailability) break;
        }

        if (dayHasAvailability) {
          available.add(dateStr);
        }
      }

      setAvailableDays(available);
    } catch (error) {
      console.error('❌ Error loading available days:', error);
      setAvailableDays(new Set());
    }
  };

  const loadStaffAndTimeSlots = async (date: Date) => {
    setLoadingSlots(true);
    try {
      const dayOfWeek = date.getDay();
      // Format date in Latvia timezone to avoid UTC conversion issues
      const dateStr = date.toLocaleDateString('sv-SE', { timeZone: 'Europe/Riga' }); // Format: YYYY-MM-DD

      console.log('🔵 loadStaffAndTimeSlots called with:', {
        date: dateStr,
        dayOfWeek,
        serviceId: formData.serviceId
      });

      // CRITICAL: Must have a service selected to show staff
      if (!formData.serviceId) {
        console.log('❌ No serviceId - returning empty');
        setAvailableStaff([]);
        setStaffTimeSlots({});
        setLoadingSlots(false);
        return;
      }

      // Step 1: Get the selected service details
      const selectedService = services.find(s => s.id === formData.serviceId);
      console.log('🔵 Selected service:', selectedService);
      
      if (!selectedService) {
        console.log('❌ Service not found in services array');
        setAvailableStaff([]);
        setStaffTimeSlots({});
        setLoadingSlots(false);
        return;
      }

      const serviceDuration = selectedService.duration || 60;
      console.log('🔵 Service duration:', serviceDuration, 'minutes');

      // Step 2: Get staff members assigned to this specific service via master_services
      const { data: masterServices, error: msError } = await supabase
        .from('master_services')
        .select('staff_member_id')
        .eq('service_id', formData.serviceId);

      if (msError) throw msError;

      const staffIds = masterServices?.map(ms => ms.staff_member_id) || [];
      console.log('🔵 Staff IDs from master_services:', staffIds);

      if (staffIds.length === 0) {
        console.log('❌ No staff assigned to this service');
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

      console.log('🔵 Active staff members:', allStaff?.map(s => ({ id: s.id, name: s.name })));

      // Step 3.5: Apply plan-based limit - only show allowed number of masters to clients
      let limitedStaff = allStaff || [];
      if (limitedStaff.length > 0) {
        const limit = planFeatures.maxStaffMembers;
        if (limit !== -1 && limit !== 999) {
          // Sort by creation date and take only first X masters
          limitedStaff = limitedStaff
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
            .slice(0, limit);
          console.log(`🔵 Applied plan limit: ${limit} masters, filtered from ${allStaff.length} to ${limitedStaff.length}`);
        }
      }

      if (!limitedStaff || limitedStaff.length === 0) {
        console.log('❌ No staff available within plan limit');
        setAvailableStaff([]);
        setStaffTimeSlots({});
        setLoadingSlots(false);
        return;
      }

      // Step 4: For each staff member, check if they have schedules for this day with this service
      const staffWithSchedules: any[] = [];
      const staffSlotsMap: Record<string, Array<{ time: string; isBooked: boolean; serviceId: string; serviceName: string }>> = {};

      for (const staffMember of limitedStaff) {
        console.log(`🔵 Processing staff: ${staffMember.name} (${staffMember.id})`);
        
        // Check for schedule exceptions first
        const { data: exception, error: exceptionError } = await supabase
          .from('schedule_exceptions')
          .select('*')
          .eq('professional_id', professionalId)
          .eq('staff_member_id', staffMember.id)
          .eq('exception_date', dateStr)
          .maybeSingle();

        if (exceptionError) {
          console.error('❌ Error loading exceptions:', exceptionError);
        }

        console.log(`  🔍 Exception for ${dateStr}:`, exception);

        // If exception is closed, skip this staff member
        if (exception && exception.is_closed) {
          console.log(`  ❌ Day is closed for ${staffMember.name}`);
          continue;
        }

        let relevantSchedules: any[] = [];

        // If there's an exception with special schedule, use those time ranges
        if (exception && !exception.is_closed && exception.time_ranges) {
          console.log(`  ✨ Using exception schedule for ${staffMember.name}`);
          const exceptionTimeRanges = exception.time_ranges as any[];
          
          // Convert exception time ranges to schedule format
          relevantSchedules = exceptionTimeRanges.map(range => ({
            start_time: range.start,
            end_time: range.end,
            available_services: [formData.serviceId], // All services available during exception
            is_active: true
          }));
          
          console.log(`  📅 Exception schedules:`, relevantSchedules.map(s => ({
            start: s.start_time,
            end: s.end_time
          })));
        } else {
          // No exception, use regular weekly schedule
          console.log(`  📅 Using regular schedule for ${staffMember.name}`);
          
          // Fetch schedules for this staff member on this day
          const { data: schedules, error: scheduleError } = await supabase
            .from('professional_schedules')
            .select('*')
            .eq('professional_id', professionalId)
            .eq('staff_member_id', staffMember.id)
            .eq('day_of_week', dayOfWeek)
            .eq('is_active', true);

          if (scheduleError) {
            console.error('❌ Error loading schedules:', scheduleError);
            continue;
          }

          console.log(`  📅 Found ${schedules?.length || 0} schedules for ${staffMember.name}`);
          console.log(`  📅 Schedules:`, schedules?.map(s => ({
            start: s.start_time,
            end: s.end_time,
            services: s.available_services
          })));

          // Filter schedules that include this specific service
          relevantSchedules = (schedules || []).filter(schedule => {
            const hasService = (schedule.available_services || []).includes(formData.serviceId);
            console.log(`    🔍 Schedule ${schedule.start_time}-${schedule.end_time}: includes service? ${hasService}`);
            return hasService;
          });
        }

        console.log(`  ✅ Relevant schedules: ${relevantSchedules.length}`);

        if (relevantSchedules.length === 0) {
          console.log(`  ❌ No schedules with this service for ${staffMember.name}`);
          continue;
        }

        // Fetch existing bookings for this staff member on this date
        // CRITICAL: Include 'completed' status to prevent reopening time slots after completion
        const { data: bookings, error: bookingsError } = await supabase
          .from('bookings')
          .select('booking_time, booking_end_time')
          .eq('professional_id', professionalId)
          .eq('staff_member_id', staffMember.id)
          .eq('booking_date', dateStr)
          .in('status', ['pending', 'confirmed', 'completed']);

        if (bookingsError) {
          console.error('❌ Error loading bookings:', bookingsError);
          continue;
        }

        console.log(`  📝 Existing bookings: ${bookings?.length || 0}`);

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
            
            // Standard overlap check: slotStart < bookingEnd && slotEnd > bookingStart
            return slotStartMin < rangeEndMin && slotEndMin > rangeStartMin;
          });
        };

        // Generate time slots based on service duration
        const slots: Array<{ time: string; isBooked: boolean; serviceId: string; serviceName: string }> = [];
        
        for (const schedule of relevantSchedules) {
          const startHour = parseInt(schedule.start_time.split(':')[0]);
          const startMinute = parseInt(schedule.start_time.split(':')[1]);
          const endHour = parseInt(schedule.end_time.split(':')[0]);
          const endMinute = parseInt(schedule.end_time.split(':')[1]);

          console.log(`    ⏰ Generating slots for ${schedule.start_time}-${schedule.end_time}, interval: ${serviceDuration}min (service duration)`);

          let currentHour = startHour;
          let currentMinute = startMinute;
          let generatedCount = 0;

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
              // Check if slot is in the past (Latvia timezone)
              // Get current date/time in Latvia timezone
              const nowUTC = new Date();
              const nowLatviaStr = nowUTC.toLocaleString('sv-SE', { timeZone: 'Europe/Riga' }); // Format: "YYYY-MM-DD HH:mm:ss"
              const [datePartLatvia, timePartLatvia] = nowLatviaStr.split(' ');
              const todayLatvia = datePartLatvia; // "YYYY-MM-DD"
              const [hourL, minuteL] = timePartLatvia.split(':').map(Number);
              const nowMinutesLatvia = hourL * 60 + minuteL;
              
              let isPastSlot = false;
              
              if (dateStr < todayLatvia) {
                // Past date - all slots are past
                isPastSlot = true;
              } else if (dateStr === todayLatvia) {
                // Today - check if time has passed
                const [slotHour, slotMinute] = timeSlot.split(':').map(Number);
                const slotMinutes = slotHour * 60 + slotMinute;
                isPastSlot = slotMinutes < nowMinutesLatvia;
              }
              // else: future date - slot is not past
              
              // Slot is unavailable if booked OR in the past
              const isBooked = hasOverlap(timeSlot, slotEndTime) || isPastSlot;
              
              // Avoid duplicates
              const existingSlot = slots.find(s => s.time === timeSlot);
              if (!existingSlot) {
                slots.push({
                  time: timeSlot,
                  isBooked,
                  serviceId: selectedService.id,
                  serviceName: selectedService.name
                });
                generatedCount++;
              }
            }

            // Move to next interval based on service duration
            currentMinute += serviceDuration;
            if (currentMinute >= 60) {
              currentHour += Math.floor(currentMinute / 60);
              currentMinute = currentMinute % 60;
            }
          }

          console.log(`      Generated ${generatedCount} time slots`);
        }

        console.log(`  📊 Total slots for ${staffMember.name}: ${slots.length} (${slots.filter(s => !s.isBooked).length} available)`);

        // Only include staff if they have at least one time slot
        if (slots.length > 0) {
          staffWithSchedules.push(staffMember);
          staffSlotsMap[staffMember.id] = slots.sort((a, b) => a.time.localeCompare(b.time));
        } else {
          console.log(`  ⚠️ ${staffMember.name} has NO time slots`);
        }
      }

      console.log('🎯 Final result:', {
        staffCount: staffWithSchedules.length,
        staffNames: staffWithSchedules.map(s => s.name)
      });

      setAvailableStaff(staffWithSchedules);
      setStaffTimeSlots(staffSlotsMap);
    } catch (error) {
      console.error('❌ Error loading staff and time slots:', error);
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

  const handleSubmit = async () => {
    if (isSubmitting) return; // Prevent multiple submissions
    
    if (validateForm()) {
      setIsSubmitting(true);
      triggerHaptic('medium');
      try {
        await onSubmit(formData as BookingFormData);
      } finally {
        setIsSubmitting(false);
      }
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

      {/* Bottom Sheet - Fresha style */}
      <div
        className={`fixed left-0 right-0 bottom-0 bg-white rounded-t-[24px] shadow-2xl transition-all duration-500 ease-out ${
          isVisible ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{
          zIndex: 10001,
          maxHeight: '90vh',
          paddingBottom: 'max(env(safe-area-inset-bottom), 24px)',
        }}
      >
        {/* Grabber */}
        <div className="flex justify-center pt-4 pb-2">
          <div className="w-10 h-1 bg-border rounded-full" />
        </div>

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-muted hover:bg-muted/80 active:bg-muted transition-all z-10"
          aria-label="Aizvērt"
        >
          <X className="w-5 h-5 text-foreground" />
        </button>

        {/* Content */}
        <div className="px-6 pb-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 80px)' }}>
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-2">Pieteikt vizīti</h2>
            <p className="text-base text-muted-foreground">{professionalName}</p>
          </div>

          {/* Form */}
          <div className="space-y-6">
            {/* Date Picker */}
            <div>
              <Label className="text-base font-semibold text-foreground mb-3 block">
                Izvēlies datumu <span className="text-destructive">*</span>
              </Label>
              <div className="border border-border rounded-2xl p-5 bg-background flex items-center justify-center overflow-hidden">
                <div className="w-full max-w-full flex justify-center">
                  <Calendar
                    mode="single"
                    selected={formData.date}
                    onSelect={(date) => setFormData({ ...formData, date, time: undefined, staffMemberId: undefined })}
                    onMonthChange={(month) => setCurrentMonth(month)}
                    disabled={(date) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      
                      if (date < today) return true;
                      if (date > maxDate) return true;
                      
                      // Check if date is in closed exceptions - normalize to YYYY-MM-DD in local timezone
                      const year = date.getFullYear();
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      const day = String(date.getDate()).padStart(2, '0');
                      const dateStr = `${year}-${month}-${day}`;
                      
                      const exception = scheduleExceptions.find(e => e.exception_date === dateStr);
                      if (exception?.is_closed) {
                        console.log('🚫 Date blocked:', dateStr, 'is closed');
                        return true;
                      }
                      
                      return false;
                    }}
                    modifiers={{
                      closed: (date) => {
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        const dateStr = `${year}-${month}-${day}`;
                        const exception = scheduleExceptions.find(e => e.exception_date === dateStr);
                        return exception?.is_closed || false;
                      },
                      specialSchedule: (date) => {
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        const dateStr = `${year}-${month}-${day}`;
                        const exception = scheduleExceptions.find(e => e.exception_date === dateStr);
                        return !exception?.is_closed && !!exception?.time_ranges;
                      },
                      hasAvailability: (date) => {
                        if (!formData.serviceId) return false;
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        if (date < today) return false;
                        if (date > maxDate) return false;
                        
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        const dateStr = `${year}-${month}-${day}`;
                        return availableDays.has(dateStr);
                      }
                    }}
                    modifiersClassNames={{
                      closed: 'bg-muted/50 text-muted-foreground line-through opacity-40 cursor-not-allowed',
                      specialSchedule: 'bg-primary/10 font-semibold',
                      hasAvailability: '!bg-emerald-100 !text-emerald-700 font-medium hover:!bg-emerald-200'
                    }}
                    className={cn("pointer-events-auto")}
                  />
                </div>
              </div>
              <div className="mt-3 text-xs text-muted-foreground space-y-1">
                {formData.serviceId && availableDays.size > 0 && (
                  <p className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-100"></span>
                    <span>Pieejams</span>
                  </p>
                )}
                {scheduleExceptions.some(e => e.is_closed) && (
                  <p className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-muted/50 border border-border"></span>
                    <span>Slēgts</span>
                  </p>
                )}
                {scheduleExceptions.some(e => !e.is_closed && e.time_ranges) && (
                  <p className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-primary/10 border border-primary/30"></span>
                    <span>Speciāls darba laiks</span>
                  </p>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Pieejama rezervācija {maxDaysFromPlan} dienām uz priekšu
              </p>
              {errors.date && (
                <p className="text-sm text-destructive mt-2">{errors.date}</p>
              )}
            </div>

            {/* Staff Members and Time Slots */}
            {formData.date && (
              <div>
                <Label className="text-base font-semibold text-foreground mb-3 block">
                  Pieejamie meistari un laiki
                </Label>
                {loadingSlots ? (
                  <div className="text-center py-12 text-muted-foreground text-base">
                    Ielādē pieejamos laikus...
                  </div>
                ) : availableStaff.length === 0 ? (
                  <div className="text-base text-amber-700 text-center py-6 bg-amber-50 rounded-2xl border border-amber-200">
                    Šajā datumā visi laiki ir aizņemti
                  </div>
                ) : (
                  <div className="space-y-5">
                    {availableStaff.map((staff) => {
                      const slots = staffTimeSlots[staff.id] || [];
                      const selectedService = services.find(s => s.id === formData.serviceId);
                      const serviceDuration = selectedService?.duration || 60;

                      return (
                        <div key={staff.id} className="border border-border rounded-2xl p-5 bg-background">
                          <div className="flex items-center gap-4 mb-4">
                            {staff.avatar ? (
                              <img 
                                src={staff.avatar} 
                                alt={staff.name}
                                className="w-14 h-14 rounded-2xl object-cover"
                              />
                            ) : (
                              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                                {staff.name.charAt(0)}
                              </div>
                            )}
                            <div>
                              <div className="font-bold text-base text-foreground">{staff.name}</div>
                              {staff.position && (
                                <div className="text-sm text-muted-foreground">{staff.position}</div>
                              )}
                              <div className="text-xs text-primary font-semibold mt-1">
                                Ilgums: {serviceDuration} min
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            {slots.map((slot) => (
                              <button
                                key={`${staff.id}-${slot.time}`}
                                type="button"
                                onClick={() => {
                                  if (!slot.isBooked) {
                                    triggerHaptic('light');
                                    setFormData({ 
                                      ...formData, 
                                      staffMemberId: staff.id, 
                                      serviceId: slot.serviceId,
                                      time: slot.time 
                                    });
                                  }
                                }}
                                disabled={slot.isBooked}
                                className={cn(
                                  "p-3.5 rounded-2xl border text-sm font-semibold transition-all duration-200",
                                  slot.isBooked
                                    ? "bg-muted border-border text-muted-foreground line-through pointer-events-none"
                                    : formData.time === slot.time && formData.staffMemberId === staff.id
                                      ? "border-primary bg-primary text-white shadow-md"
                                      : "border-border bg-card hover:border-primary hover:shadow-sm active:scale-95"
                                )}
                              >
                                {slot.time}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName" className="text-base font-semibold text-foreground mb-2 block">
                  Vārds <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="firstName"
                  value={formData.firstName || ''}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className={cn(
                    "h-14 rounded-2xl border text-base",
                    errors.firstName ? "border-destructive" : "border-border"
                  )}
                  placeholder="Jānis"
                />
                {errors.firstName && (
                  <p className="text-sm text-destructive mt-2">{errors.firstName}</p>
                )}
              </div>
              <div>
                <Label htmlFor="lastName" className="text-base font-semibold text-foreground mb-2 block">
                  Uzvārds <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="lastName"
                  value={formData.lastName || ''}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className={cn(
                    "h-14 rounded-2xl border text-base",
                    errors.lastName ? "border-destructive" : "border-border"
                  )}
                  placeholder="Bērziņš"
                />
                {errors.lastName && (
                  <p className="text-sm text-destructive mt-2">{errors.lastName}</p>
                )}
              </div>
            </div>

            {/* Phone */}
            <div>
              <Label htmlFor="phone" className="text-base font-semibold text-foreground mb-2 block">
                Telefona numurs <span className="text-destructive">*</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className={cn(
                  "h-14 rounded-2xl border text-base",
                  errors.phone ? "border-destructive" : "border-border"
                )}
                placeholder="+371 20 000 000"
              />
              {errors.phone && (
                <p className="text-sm text-destructive mt-2">{errors.phone}</p>
              )}
            </div>


            {/* Notes */}
            <div>
              <Label htmlFor="notes" className="text-base font-semibold text-foreground mb-2 block">
                Piezīmes (neobligāti)
              </Label>
              <Textarea
                id="notes"
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="rounded-2xl border border-border resize-none text-base"
                placeholder="Jutīga āda, alerģijas u.c."
                rows={3}
              />
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={!formData.date || !formData.time || isSubmitting}
              className="w-full h-16 rounded-2xl text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-200 active:scale-[0.98]"
            >
              {isSubmitting ? 'Rezervē...' : 'Apstiprināt rezervāciju'}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ModernBookingModal;
