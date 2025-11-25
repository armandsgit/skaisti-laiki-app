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
  onEdit?: (service: any) => void;
  onDelete?: (id: string) => void;
  disabled?: boolean;
}

export const ServiceCard = ({ service, onEdit, onDelete, disabled = false }: ServiceCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card className="border border-border shadow-card overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-1 text-base">{service.name}</h3>
              {service.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">{service.description}</p>
              )}
              {service.staff_members && (
                <Badge variant="secondary" className="mt-2 gap-1 rounded-full">
                  <User className="w-3 h-3" />
                  <span className="text-xs">{service.staff_members.name}</span>
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Euro className="w-4 h-4 text-foreground" />
              <span className="text-lg font-bold text-foreground">€{service.price}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{service.duration} min</span>
            </div>
          </div>

          <div className="flex gap-2">
            {onEdit && !disabled && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(service)}
                className="flex-1"
              >
                <Edit className="w-4 h-4 mr-1" />
                Rediģēt
              </Button>
            )}
            {onDelete && !disabled && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(service.id)}
                className="text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            {disabled && (
              <div className="flex-1 text-center py-2 text-xs text-muted-foreground">
                Nav rediģējams
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
