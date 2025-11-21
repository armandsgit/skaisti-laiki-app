import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Clock } from 'lucide-react';

interface Service {
  id: string;
  name: string;
  duration: number;
  price: number;
  description?: string;
}

interface ServiceDurationManagerProps {
  professionalId: string;
}

const DURATION_OPTIONS = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '60 min' },
  { value: 90, label: '90 min' },
  { value: 120, label: '120 min' },
  { value: 180, label: '180 min' },
  { value: 240, label: '240 min' },
];

const ServiceDurationManager = ({ professionalId }: ServiceDurationManagerProps) => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadServices();
  }, [professionalId]);

  const loadServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('professional_id', professionalId)
        .order('name');

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error loading services:', error);
      toast.error('Neizdevās ielādēt pakalpojumus');
    } finally {
      setLoading(false);
    }
  };

  const updateServiceDuration = async (serviceId: string, duration: number) => {
    try {
      const { error } = await supabase
        .from('services')
        .update({ duration })
        .eq('id', serviceId);

      if (error) throw error;

      // Update local state
      setServices(prev =>
        prev.map(s => (s.id === serviceId ? { ...s, duration } : s))
      );

      toast.success('Pakalpojuma ilgums atjaunināts');
    } catch (error) {
      console.error('Error updating service duration:', error);
      toast.error('Neizdevās atjaunināt pakalpojuma ilgumu');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Pakalpojumu ilgumi
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

  if (services.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Pakalpojumu ilgumi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Nav pievienotu pakalpojumu
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Pakalpojumu ilgumi
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Iestatiet katra pakalpojuma ilgumu minūtēs
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {services.map((service) => (
          <div key={service.id} className="border rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-semibold text-base">{service.name}</h4>
                {service.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {service.description}
                  </p>
                )}
                <p className="text-sm text-muted-foreground mt-1">
                  Cena: €{service.price}
                </p>
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">
                Pakalpojuma ilgums
              </Label>
              <Select
                value={String(service.duration)}
                onValueChange={(value) =>
                  updateServiceDuration(service.id, Number(value))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={String(option.value)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default ServiceDurationManager;
