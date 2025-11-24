import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, Send, TrendingUp } from 'lucide-react';

interface EmailStatsCardProps {
  emailCredits: number;
  emailStats: {
    sentToday: number;
    sentThisMonth: number;
    sent30Days: number;
  };
  onSendTest: () => void;
  onNavigateToBilling: () => void;
  sendingEmail: boolean;
}

export const EmailStatsCard = ({ 
  emailCredits, 
  emailStats, 
  onSendTest, 
  onNavigateToBilling,
  sendingEmail 
}: EmailStatsCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Mail className="w-5 h-5" />
          E-pasta statistika
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Credits Display */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">Pieejamie kredīti</p>
            <p className="text-2xl font-bold">{emailCredits}</p>
          </div>
          <Button 
            onClick={onNavigateToBilling}
            variant="outline"
            size="sm"
          >
            Pirkt vairāk
          </Button>
        </div>

        {/* Usage Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">Šodien</p>
            <p className="text-xl font-bold">{emailStats.sentToday}</p>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">Šomēnes</p>
            <p className="text-xl font-bold">{emailStats.sentThisMonth}</p>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">30 dienas</p>
            <p className="text-xl font-bold">{emailStats.sent30Days}</p>
          </div>
        </div>

        {/* Test Email Button */}
        <Button 
          onClick={onSendTest}
          disabled={sendingEmail || emailCredits < 1}
          className="w-full"
          variant="outline"
        >
          <Send className="w-4 h-4 mr-2" />
          {sendingEmail ? 'Sūta...' : 'Nosūtīt testa e-pastu'}
        </Button>

        {emailCredits < 1 && (
          <p className="text-xs text-destructive text-center">
            Nav pietiekami kredīti e-pasta sūtīšanai
          </p>
        )}
      </CardContent>
    </Card>
  );
};
