import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Clock, Calendar, Plus, X } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptic';

interface Schedule {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  available_services?: string[];
}

interface Service {
  id: string;
  name: string;
  duration: number;
  price: number;
}

interface WorkScheduleManagerProps {
  professionalId: string;
  staffMemberId?: string | null;
}

const DAYS = [
  { value: 1, label: 'Pirmdiena' },
  { value: 2, label: 'Otrdiena' },
  { value: 3, label: 'Trešdiena' },
  { value: 4, label: 'Ceturtdiena' },
  { value: 5, label: 'Piektdiena' },
  { value: 6, label: 'Sestdiena' },
  { value: 0, label: 'Svētdiena' },
];

const WorkScheduleManager = ({ professionalId, staffMemberId }: WorkScheduleManagerProps) => {
  const [schedules, setSchedules] = useState<Record<number, Schedule[]>>({});
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSchedules();
    loadServices();
  }, [professionalId, staffMemberId]);

  const loadServices = async () => {
    try {
      if (staffMemberId) {
        // For specific staff member, load services via master_services table
        const { data: masterServices, error: msError } = await supabase
          .from('master_services')
          .select('service_id')
          .eq('staff_member_id', staffMemberId);

        if (msError) throw msError;

        const serviceIds = masterServices?.map(ms => ms.service_id) || [];

        if (serviceIds.length === 0) {
          setServices([]);
          return;
        }

        const { data: servicesData, error: servicesError } = await supabase
          .from('services')
          .select('*')
          .eq('professional_id', professionalId)
          .in('id', serviceIds)
          .order('name');

        if (servicesError) throw servicesError;
        setServices(servicesData || []);
      } else {
        // For professional owner, get their staff member ID and load services via master_services
        const { data: ownerStaff, error: staffError } = await supabase
          .from('staff_members')
          .select('id')
          .eq('professional_id', professionalId)
          .eq('position', 'Īpašnieks')
          .maybeSingle();

        if (staffError) throw staffError;

        if (!ownerStaff) {
          // Fallback: load all services without staff_member_id
          const { data, error } = await supabase
            .from('services')
            .select('*')
            .eq('professional_id', professionalId)
            .is('staff_member_id', null)
            .order('name');

          if (error) throw error;
          setServices(data || []);
          return;
        }

        // Load services assigned to owner via master_services
        const { data: masterServices, error: msError } = await supabase
          .from('master_services')
          .select('service_id')
          .eq('staff_member_id', ownerStaff.id);

        if (msError) throw msError;

        const serviceIds = masterServices?.map(ms => ms.service_id) || [];

        if (serviceIds.length === 0) {
          setServices([]);
          return;
        }

        const { data: servicesData, error: servicesError } = await supabase
          .from('services')
          .select('*')
          .eq('professional_id', professionalId)
          .in('id', serviceIds)
          .order('name');

        if (servicesError) throw servicesError;
        setServices(servicesData || []);
      }
    } catch (error) {
      console.error('Error loading services:', error);
      toast.error('Neizdevās ielādēt pakalpojumus');
    }
  };

  const loadSchedules = async () => {
    try {
      let query = supabase
        .from('professional_schedules')
        .select('*')
        .eq('professional_id', professionalId);

      if (staffMemberId) {
        query = query.eq('staff_member_id', staffMemberId);
      } else {
        query = query.is('staff_member_id', null);
      }

      const { data, error } = await query
        .order('day_of_week')
        .order('start_time');

      if (error) throw error;

      // Group by day_of_week
      const grouped = (data || []).reduce((acc, schedule) => {
        if (!acc[schedule.day_of_week]) {
          acc[schedule.day_of_week] = [];
        }
        acc[schedule.day_of_week].push(schedule);
        return acc;
      }, {} as Record<number, Schedule[]>);

      setSchedules(grouped);
    } catch (error) {
      console.error('Error loading schedules:', error);
      toast.error('Neizdevās ielādēt darba grafiku');
    } finally {
      setLoading(false);
    }
  };

  const addTimeSlot = async (dayOfWeek: number) => {
    triggerHaptic('light');
    
    // Automatically select all available services for this staff member
    const serviceIds = services.map(s => s.id);
    
    const newSchedule: Schedule = {
      day_of_week: dayOfWeek,
      start_time: '09:00',
      end_time: '17:00',
      is_active: true,
      available_services: serviceIds,
    };

    try {
      const { data, error } = await supabase
        .from('professional_schedules')
        .insert({
          professional_id: professionalId,
          staff_member_id: staffMemberId || null,
          ...newSchedule,
        })
        .select()
        .single();

      if (error) throw error;

      setSchedules(prev => ({
        ...prev,
        [dayOfWeek]: [...(prev[dayOfWeek] || []), data],
      }));

      toast.success('Darba laiks pievienots');
    } catch (error) {
      console.error('Error adding schedule:', error);
      toast.error('Neizdevās pievienot darba laiku');
    }
  };

  const updateSchedule = async (scheduleId: string, updates: Partial<Schedule>) => {
    try {
      const { error } = await supabase
        .from('professional_schedules')
        .update(updates)
        .eq('id', scheduleId);

      if (error) throw error;

      // Update local state
      setSchedules(prev => {
        const newSchedules = { ...prev };
        Object.keys(newSchedules).forEach(day => {
          newSchedules[Number(day)] = newSchedules[Number(day)].map(s =>
            s.id === scheduleId ? { ...s, ...updates } : s
          );
        });
        return newSchedules;
      });

      toast.success('Darba laiks atjaunināts');
    } catch (error) {
      console.error('Error updating schedule:', error);
      toast.error('Neizdevās atjaunināt darba laiku');
    }
  };

  const deleteSchedule = async (scheduleId: string, dayOfWeek: number) => {
    triggerHaptic('medium');

    try {
      const { error } = await supabase
        .from('professional_schedules')
        .delete()
        .eq('id', scheduleId);

      if (error) throw error;

      setSchedules(prev => ({
        ...prev,
        [dayOfWeek]: prev[dayOfWeek].filter(s => s.id !== scheduleId),
      }));

      toast.success('Darba laiks dzēsts');
    } catch (error) {
      console.error('Error deleting schedule:', error);
      toast.error('Neizdevās dzēst darba laiku');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Darba grafiks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Ielādē...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Darba grafiks
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Iestatiet savus darba laikus katrai nedēļas dienai
        </p>
        
        <div className="mt-3 space-y-2">
          <div className="px-4 py-2 bg-muted/50 rounded-lg border border-border/50">
            <p className="text-xs text-muted-foreground">
              ℹ️ <span className="font-medium">Laika solis:</span> Pieejamie rezervācijas laiki tiek ģenerēti automātiski, pamatojoties uz pakalpojuma ilgumu.
            </p>
          </div>
          
          {services.length > 0 && (
            <div className="px-4 py-3 bg-primary/5 rounded-lg border border-primary/20">
              <p className="text-xs font-medium text-primary mb-2">Jūsu pakalpojumu laika soļi:</p>
              <div className="space-y-1">
                {services.map(service => (
                  <div key={service.id} className="text-xs text-muted-foreground flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    <span className="font-medium">{service.name}:</span>
                    <span>{service.duration} min → laiki ar {service.duration} min soli</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {DAYS.map((day) => (
          <div key={day.value} className="border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-base">{day.label}</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => addTimeSlot(day.value)}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Pievienot laiku
              </Button>
            </div>

            {schedules[day.value]?.length > 0 ? (
              <div className="space-y-2">
                {schedules[day.value].map((schedule) => (
                  <div
                    key={schedule.id}
                    className="flex flex-col gap-3 bg-muted/50 p-3 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">No</Label>
                          <input
                            type="time"
                            value={schedule.start_time}
                            onChange={(e) =>
                              schedule.id &&
                              updateSchedule(schedule.id, { start_time: e.target.value })
                            }
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Līdz</Label>
                          <input
                            type="time"
                            value={schedule.end_time}
                            onChange={(e) =>
                              schedule.id &&
                              updateSchedule(schedule.id, { end_time: e.target.value })
                            }
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Switch
                          checked={schedule.is_active}
                          onCheckedChange={(checked) =>
                            schedule.id && updateSchedule(schedule.id, { is_active: checked })
                          }
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => schedule.id && deleteSchedule(schedule.id, day.value)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nav iestatīti darba laiki
              </p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default WorkScheduleManager;
