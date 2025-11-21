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
      gradient: 'from-primary to-secondary',
      bgGradient: 'from-primary/10 to-secondary/10',
    },
    {
      label: 'Mēnesī kopā',
      value: `€${monthlyEarnings.toFixed(2)}`,
      icon: TrendingUp,
      gradient: 'from-secondary to-primary',
      bgGradient: 'from-secondary/10 to-primary/10',
    },
    {
      label: 'Šodienas rezerv.',
      value: todayBookings.toString(),
      icon: Calendar,
      gradient: 'from-primary to-secondary',
      bgGradient: 'from-primary/10 to-secondary/10',
    },
    {
      label: 'Pabeigti pakalpoj.',
      value: completedServices.toString(),
      icon: CheckCircle,
      gradient: 'from-secondary to-primary',
      bgGradient: 'from-secondary/10 to-primary/10',
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
          <Card className="border-0 shadow-soft overflow-hidden">
            <CardContent className={`p-4 bg-gradient-to-br ${stat.bgGradient}`}>
              <div className="flex items-start justify-between mb-2">
                <div className={`p-2 rounded-xl bg-gradient-to-br ${stat.gradient}`}>
                  <stat.icon className="w-4 h-4 text-white" />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground mb-1">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};
