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
  service: any;
  professionalName: string;
  onSubmit: (data: BookingFormData) => void;
}

export interface BookingFormData {
  firstName: string;
  lastName: string;
  phone: string;
  date: Date;
  time: string;
  notes?: string;
}

const ModernBookingModal = ({ isOpen, onClose, service, professionalName, onSubmit }: ModernBookingModalProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [formData, setFormData] = useState<Partial<BookingFormData>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

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

  // Load available time slots when date changes
  useEffect(() => {
    if (formData.date && service.professional_id) {
      loadAvailableTimeSlots(service.professional_id, formData.date);
    }
  }, [formData.date, service.professional_id]);

  const loadAvailableTimeSlots = async (professionalId: string, date: Date) => {
    setLoadingSlots(true);
    try {
      const dayOfWeek = date.getDay();
      const dateStr = date.toISOString().split('T')[0];

      // Fetch professional's schedule for this day
      const { data: schedules, error: scheduleError } = await supabase
        .from('professional_schedules')
        .select('*')
        .eq('professional_id', professionalId)
        .eq('day_of_week', dayOfWeek)
        .eq('is_active', true);

      if (scheduleError) throw scheduleError;

      if (!schedules || schedules.length === 0) {
        setTimeSlots([]);
        return;
      }

      // Fetch existing bookings for this date
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('booking_time')
        .eq('professional_id', professionalId)
        .eq('booking_date', dateStr)
        .in('status', ['pending', 'confirmed']);

      if (bookingsError) throw bookingsError;

      const bookedTimes = new Set(bookings?.map(b => b.booking_time) || []);

      // Generate time slots from schedules
      const slots: string[] = [];
      schedules.forEach(schedule => {
        const startHour = parseInt(schedule.start_time.split(':')[0]);
        const startMinute = parseInt(schedule.start_time.split(':')[1]);
        const endHour = parseInt(schedule.end_time.split(':')[0]);
        const endMinute = parseInt(schedule.end_time.split(':')[1]);

        let currentHour = startHour;
        let currentMinute = startMinute;

        while (
          currentHour < endHour || 
          (currentHour === endHour && currentMinute < endMinute)
        ) {
          const timeSlot = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
          
          if (!bookedTimes.has(timeSlot)) {
            slots.push(timeSlot);
          }

          // Increment by service duration (default 30 min intervals)
          currentMinute += 30;
          if (currentMinute >= 60) {
            currentHour += 1;
            currentMinute -= 60;
          }
        }
      });

      setTimeSlots(slots.sort());
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
              <span>•</span>
              <span>{service.name}</span>
            </div>
            <div className="flex items-center justify-center gap-3 mt-2 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                💶 €{service.price}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                ⏱️ {service.duration} min
              </span>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-5">
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

            {/* Date Picker */}
            <div>
              <Label className="text-sm font-semibold text-gray-700 mb-2 block">
                Izvēlies datumu <span className="text-red-500">*</span>
              </Label>
              <div className="border-2 border-gray-200 rounded-2xl p-4 bg-gray-50">
                <Calendar
                  mode="single"
                  selected={formData.date}
                  onSelect={(date) => setFormData({ ...formData, date })}
                  disabled={(date) => date < new Date()}
                  className={cn("rounded-xl pointer-events-auto")}
                />
              </div>
              {errors.date && (
                <p className="text-xs text-red-500 mt-1">{errors.date}</p>
              )}
            </div>

            {/* Time Slots */}
            {formData.date && (
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
                    {timeSlots.map((time) => (
                      <button
                        key={time}
                        onClick={() => {
                          triggerHaptic('light');
                          setFormData({ ...formData, time });
                        }}
                        className={cn(
                          "py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-95",
                          formData.time === time
                            ? "bg-gradient-to-r from-primary to-secondary text-white shadow-lg"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        )}
                      >
                        {time}
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
