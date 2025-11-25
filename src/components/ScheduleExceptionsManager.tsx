import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus, Trash2, Calendar as CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { lv } from "date-fns/locale";

interface ScheduleException {
  id: string;
  exception_date: string;
  is_closed: boolean;
  time_ranges: TimeRange[] | null;
  staff_member_id?: string;
}

interface TimeRange {
  start: string;
  end: string;
}

interface ScheduleExceptionsManagerProps {
  professionalId: string;
  staffMemberId?: string;
}

export function ScheduleExceptionsManager({ professionalId, staffMemberId }: ScheduleExceptionsManagerProps) {
  const [exceptions, setExceptions] = useState<ScheduleException[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [exceptionType, setExceptionType] = useState<"closed" | "special">("closed");
  const [timeRanges, setTimeRanges] = useState<TimeRange[]>([{ start: "09:00", end: "17:00" }]);
  const [editingException, setEditingException] = useState<ScheduleException | null>(null);

  useEffect(() => {
    loadExceptions();
  }, [professionalId, staffMemberId]);

  const loadExceptions = async () => {
    try {
      setIsLoading(true);
      let query = supabase
        .from("schedule_exceptions")
        .select("*")
        .eq("professional_id", professionalId)
        .order("exception_date", { ascending: true });

      if (staffMemberId) {
        query = query.eq("staff_member_id", staffMemberId);
      } else {
        query = query.is("staff_member_id", null);
      }

      const { data, error } = await query;

      if (error) throw error;
      setExceptions((data || []).map(item => ({
        ...item,
        time_ranges: (item.time_ranges as any) as TimeRange[] | null
      })));
    } catch (error) {
      console.error("Error loading exceptions:", error);
      toast.error("Kļūda ielādējot izņēmumus");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (exception?: ScheduleException) => {
    if (exception) {
      setEditingException(exception);
      setSelectedDate(new Date(exception.exception_date));
      setExceptionType(exception.is_closed ? "closed" : "special");
      setTimeRanges(exception.time_ranges || [{ start: "09:00", end: "17:00" }]);
    } else {
      setEditingException(null);
      setSelectedDate(undefined);
      setExceptionType("closed");
      setTimeRanges([{ start: "09:00", end: "17:00" }]);
    }
    setIsDialogOpen(true);
  };

  const handleAddTimeRange = () => {
    setTimeRanges([...timeRanges, { start: "09:00", end: "17:00" }]);
  };

  const handleRemoveTimeRange = (index: number) => {
    setTimeRanges(timeRanges.filter((_, i) => i !== index));
  };

  const handleTimeRangeChange = (index: number, field: "start" | "end", value: string) => {
    const newRanges = [...timeRanges];
    newRanges[index][field] = value;
    setTimeRanges(newRanges);
  };

  const validateTimeRanges = (): boolean => {
    for (let i = 0; i < timeRanges.length; i++) {
      const range = timeRanges[i];
      if (range.start >= range.end) {
        toast.error(`Laika intervāls ${i + 1}: Sākuma laiks nevar būt lielāks vai vienāds ar beigu laiku`);
        return false;
      }

      for (let j = i + 1; j < timeRanges.length; j++) {
        const otherRange = timeRanges[j];
        if (
          (range.start < otherRange.end && range.end > otherRange.start) ||
          (otherRange.start < range.end && otherRange.end > range.start)
        ) {
          toast.error("Laika intervāli nedrīkst pārklāties");
          return false;
        }
      }
    }
    return true;
  };

  const handleSaveException = async () => {
    if (!selectedDate) {
      toast.error("Lūdzu izvēlieties datumu");
      return;
    }

    if (exceptionType === "special" && !validateTimeRanges()) {
      return;
    }

    try {
      const exceptionData = {
        professional_id: professionalId,
        staff_member_id: staffMemberId || null,
        exception_date: format(selectedDate, "yyyy-MM-dd"),
        is_closed: exceptionType === "closed",
        time_ranges: exceptionType === "special" ? JSON.parse(JSON.stringify(timeRanges)) : null,
      };

      if (editingException) {
        const { error } = await supabase
          .from("schedule_exceptions")
          .update(exceptionData)
          .eq("id", editingException.id);

        if (error) throw error;
        toast.success("Izņēmums atjaunināts");
      } else {
        const { error } = await supabase
          .from("schedule_exceptions")
          .insert(exceptionData);

        if (error) throw error;
        toast.success("Izņēmums pievienots");
      }

      setIsDialogOpen(false);
      loadExceptions();
    } catch (error) {
      console.error("Error saving exception:", error);
      toast.error("Kļūda saglabājot izņēmumu");
    }
  };

  const handleDeleteException = async (id: string) => {
    try {
      const { error } = await supabase
        .from("schedule_exceptions")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Izņēmums dzēsts");
      loadExceptions();
    } catch (error) {
      console.error("Error deleting exception:", error);
      toast.error("Kļūda dzēšot izņēmumu");
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <Card className="border-0 shadow-card">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-h4 font-heading">Izņēmumu dienas</CardTitle>
          <Button
            onClick={() => handleOpenDialog()}
            size="sm"
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Pievienot izņēmumu
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Ielādē...</div>
        ) : exceptions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nav pievienotu izņēmumu dienu
          </div>
        ) : (
          <div className="space-y-3">
            {exceptions.map((exception) => (
              <div
                key={exception.id}
                className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-card hover:bg-secondary/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <CalendarIcon className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-semibold">
                      {format(new Date(exception.exception_date), "dd. MMMM, yyyy", { locale: lv })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {exception.is_closed ? (
                        <span className="text-destructive font-medium">Slēgts</span>
                      ) : (
                        <>
                          <span className="text-primary font-medium">Speciāls darba laiks:</span>{" "}
                          {exception.time_ranges?.map((range, idx) => (
                            <span key={idx}>
                              {range.start}–{range.end}
                              {idx < (exception.time_ranges?.length || 0) - 1 && ", "}
                            </span>
                          ))}
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenDialog(exception)}
                  >
                    Rediģēt
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteException(exception.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingException ? "Rediģēt izņēmumu" : "Pievienot izņēmuma dienu"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div>
                <Label className="text-sm font-semibold mb-3 block">Izvēlieties datumu</Label>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date < today}
                  className="rounded-xl border pointer-events-auto"
                />
              </div>

              <div>
                <Label className="text-sm font-semibold mb-3 block">Dienas tips</Label>
                <RadioGroup value={exceptionType} onValueChange={(v) => setExceptionType(v as "closed" | "special")}>
                  <div className="flex items-center space-x-2 p-3 rounded-lg border border-border/50 hover:bg-secondary/30 transition-colors">
                    <RadioGroupItem value="closed" id="closed" />
                    <Label htmlFor="closed" className="flex-1 cursor-pointer">
                      <span className="font-medium">Slēgts</span>
                      <p className="text-sm text-muted-foreground">Nepieņem rezervācijas šajā dienā</p>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 rounded-lg border border-border/50 hover:bg-secondary/30 transition-colors">
                    <RadioGroupItem value="special" id="special" />
                    <Label htmlFor="special" className="flex-1 cursor-pointer">
                      <span className="font-medium">Speciāls darba laiks</span>
                      <p className="text-sm text-muted-foreground">Īpašs grafiks tikai šai dienai</p>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {exceptionType === "special" && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-sm font-semibold">Darba laika intervāli</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddTimeRange}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Pievienot intervālu
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {timeRanges.map((range, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 rounded-lg border border-border/50">
                        <div className="flex-1 grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">Sākums</Label>
                            <Input
                              type="time"
                              value={range.start}
                              onChange={(e) => handleTimeRangeChange(index, "start", e.target.value)}
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">Beigas</Label>
                            <Input
                              type="time"
                              value={range.end}
                              onChange={(e) => handleTimeRangeChange(index, "end", e.target.value)}
                            />
                          </div>
                        </div>
                        {timeRanges.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveTimeRange(index)}
                          >
                            <X className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="flex-1"
                >
                  Atcelt
                </Button>
                <Button
                  onClick={handleSaveException}
                  className="flex-1"
                >
                  Saglabāt
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
