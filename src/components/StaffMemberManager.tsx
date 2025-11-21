import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, User } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptic';

interface StaffMember {
  id: string;
  name: string;
  position: string | null;
  avatar: string | null;
  is_active: boolean;
}

interface StaffMemberManagerProps {
  professionalId: string;
  onSelectStaffMember?: (staffMemberId: string | null) => void;
  selectedStaffMemberId?: string | null;
}

const StaffMemberManager = ({ professionalId, onSelectStaffMember, selectedStaffMemberId }: StaffMemberManagerProps) => {
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    position: '',
    avatar: '',
  });

  useEffect(() => {
    loadStaffMembers();
  }, [professionalId]);

  const loadStaffMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('staff_members')
        .select('*')
        .eq('professional_id', professionalId)
        .eq('is_active', true)
        .order('created_at');

      if (error) throw error;
      setStaffMembers(data || []);
    } catch (error) {
      console.error('Error loading staff members:', error);
      toast.error('Neizdevās ielādēt meistarus');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic('medium');

    if (!formData.name.trim()) {
      toast.error('Vārds ir obligāts');
      return;
    }

    try {
      if (editingStaff) {
        const { error } = await supabase
          .from('staff_members')
          .update({
            name: formData.name,
            position: formData.position || null,
            avatar: formData.avatar || null,
          })
          .eq('id', editingStaff.id);

        if (error) throw error;
        toast.success('Meistars atjaunināts');
      } else {
        const { error } = await supabase
          .from('staff_members')
          .insert({
            professional_id: professionalId,
            name: formData.name,
            position: formData.position || null,
            avatar: formData.avatar || null,
          });

        if (error) throw error;
        toast.success('Meistars pievienots');
      }

      setIsDialogOpen(false);
      setEditingStaff(null);
      setFormData({ name: '', position: '', avatar: '' });
      loadStaffMembers();
    } catch (error) {
      console.error('Error saving staff member:', error);
      toast.error('Neizdevās saglabāt meistaru');
    }
  };

  const handleEdit = (staff: StaffMember) => {
    setEditingStaff(staff);
    setFormData({
      name: staff.name,
      position: staff.position || '',
      avatar: staff.avatar || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (staffId: string) => {
    triggerHaptic('medium');
    
    if (!confirm('Vai tiešām vēlaties dzēst šo meistaru?')) return;

    try {
      // First, unassign this staff member from all services
      const { error: servicesError } = await supabase
        .from('services')
        .update({ staff_member_id: null })
        .eq('staff_member_id', staffId);

      if (servicesError) throw servicesError;

      // Then soft-delete the staff member
      const { error } = await supabase
        .from('staff_members')
        .update({ is_active: false })
        .eq('id', staffId);

      if (error) throw error;
      toast.success('Meistars dzēsts un pakalpojumi atbrīvoti');
      loadStaffMembers();
    } catch (error) {
      console.error('Error deleting staff member:', error);
      toast.error('Neizdevās dzēst meistaru');
    }
  };

  const openDialog = () => {
    setEditingStaff(null);
    setFormData({ name: '', position: '', avatar: '' });
    setIsDialogOpen(true);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Meistari
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
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Meistari
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" onClick={openDialog} className="gap-2">
                <Plus className="w-4 h-4" />
                Pievienot meistaru
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingStaff ? 'Rediģēt meistaru' : 'Pievienot meistaru'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Vārds *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ievadiet vārdu"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="position">Amats</Label>
                  <Input
                    id="position"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    placeholder="piem., Manikīra meistars"
                  />
                </div>
                <div>
                  <Label htmlFor="avatar">Foto URL</Label>
                  <Input
                    id="avatar"
                    value={formData.avatar}
                    onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    {editingStaff ? 'Saglabāt' : 'Pievienot'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Atcelt
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {staffMembers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Nav pievienotu meistaru</p>
            <p className="text-sm mt-2">Pievienojiet pirmo meistaru, lai sāktu</p>
          </div>
        ) : (
          <div className="space-y-3">
            {staffMembers.map((staff) => {
              const isSelected = selectedStaffMemberId === staff.id;
              return (
                <div
                  key={staff.id}
                  className={`flex items-center gap-3 p-3 border-2 rounded-lg transition-all cursor-pointer ${
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-md scale-[1.02]'
                      : 'border-border hover:bg-muted/50 hover:border-primary/30'
                  }`}
                  onClick={() => onSelectStaffMember?.(staff.id)}
                >
                <Avatar className="h-12 w-12">
                  <AvatarImage src={staff.avatar || undefined} />
                  <AvatarFallback>
                    {staff.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h4 className="font-medium">{staff.name}</h4>
                  {staff.position && (
                    <p className="text-sm text-muted-foreground">{staff.position}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(staff);
                    }}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(staff.id);
                    }}
                    className="text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StaffMemberManager;
