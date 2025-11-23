import { Card, CardContent } from '@/components/ui/card';
import { Euro, Calendar, CheckCircle, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

interface DashboardStatsProps {
  todayEarnings: number;
  monthlyEarnings: number;
  todayBookings: number;
  completedServices: number;
}

export const DashboardStats = ({
  todayEarnings,
  monthlyEarnings,
  todayBookings,
  completedServices,
}: DashboardStatsProps) => {
  const stats = [
    {
      label: 'Šodien nopelnīts',
      value: `€${todayEarnings.toFixed(2)}`,
      icon: Euro,
    },
    {
      label: 'Mēnesī kopā',
      value: `€${monthlyEarnings.toFixed(2)}`,
      icon: TrendingUp,
    },
    {
      label: 'Šodienas rezerv.',
      value: todayBookings.toString(),
      icon: Calendar,
    },
    {
      label: 'Pabeigti pakalpoj.',
      value: completedServices.toString(),
      icon: CheckCircle,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 mb-6">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card className="border-border/50 shadow-soft overflow-hidden">
            <CardContent className="p-5 bg-muted/20">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-foreground">
                  <stat.icon className="w-4 h-4 text-background stroke-[2]" />
                </div>
              </div>
              <p className="text-[28px] font-bold text-foreground mb-1 leading-none">{stat.value}</p>
              <p className="text-[12px] text-muted-foreground font-medium">{stat.label}</p>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};
