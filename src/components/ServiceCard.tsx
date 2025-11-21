import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Euro, Edit, Trash2, User } from 'lucide-react';
import { motion } from 'framer-motion';

interface ServiceCardProps {
  service: {
    id: string;
    name: string;
    price: number;
    duration: number;
    description?: string;
    staff_members?: {
      id: string;
      name: string;
      position?: string;
    } | null;
  };
  onEdit: (service: any) => void;
  onDelete: (id: string) => void;
}

export const ServiceCard = ({ service, onEdit, onDelete }: ServiceCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card className="border-0 shadow-card overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-1">{service.name}</h3>
              {service.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">{service.description}</p>
              )}
              {service.staff_members && (
                <Badge variant="secondary" className="mt-2 gap-1">
                  <User className="w-3 h-3" />
                  {service.staff_members.name}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-1.5">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <Euro className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                €{service.price}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="p-1.5 rounded-lg bg-secondary/10">
                <Clock className="w-3.5 h-3.5 text-secondary" />
              </div>
              <span className="text-sm text-muted-foreground">{service.duration} min</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(service)}
              className="flex-1 border-primary/20 hover:bg-primary/5"
            >
              <Edit className="w-4 h-4 mr-1" />
              Rediģēt
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(service.id)}
              className="border-destructive/20 hover:bg-destructive/5 text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
