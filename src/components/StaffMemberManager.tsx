import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
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

interface Service {
  id: string;
  name: string;
}

interface StaffMemberManagerProps {
  professionalId: string;
  onSelectStaffMember?: (staffMemberId: string | null) => void;
  selectedStaffMemberId?: string | null;
}

const StaffMemberManager = ({ professionalId, onSelectStaffMember, selectedStaffMemberId }: StaffMemberManagerProps) => {
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    position: '',
    avatar: '',
  });

  useEffect(() => {
    loadStaffMembers();
    loadServices();
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

  const loadServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('id, name')
        .eq('professional_id', professionalId)
        .order('name');

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error loading services:', error);
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
      let staffId: string;

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
        staffId = editingStaff.id;

        // Delete all previous service assignments from master_services
        await supabase
          .from('master_services')
          .delete()
          .eq('staff_member_id', staffId);

        toast.success('Meistars atjaunināts');
      } else {
        const { data, error } = await supabase
          .from('staff_members')
          .insert({
            professional_id: professionalId,
            name: formData.name,
            position: formData.position || null,
            avatar: formData.avatar || null,
          })
          .select()
          .single();

        if (error) throw error;
        staffId = data.id;
        toast.success('Meistars pievienots');
      }

      // Assign selected services to this staff member via master_services
      if (selectedServiceIds.length > 0) {
        const { error: masterServicesError } = await supabase
          .from('master_services')
          .insert(
            selectedServiceIds.map(serviceId => ({
              staff_member_id: staffId,
              service_id: serviceId
            }))
          );

        if (masterServicesError) throw masterServicesError;
      }

      setIsDialogOpen(false);
      setEditingStaff(null);
      setFormData({ name: '', position: '', avatar: '' });
      setSelectedServiceIds([]);
      loadStaffMembers();
    } catch (error) {
      console.error('Error saving staff member:', error);
      toast.error('Neizdevās saglabāt meistaru');
    }
  };

  const handleEdit = async (staff: StaffMember) => {
    setEditingStaff(staff);
    setFormData({
      name: staff.name,
      position: staff.position || '',
      avatar: staff.avatar || '',
    });

    // Load staff member's current services from master_services
    try {
      const { data, error } = await supabase
        .from('master_services')
        .select('service_id')
        .eq('staff_member_id', staff.id);

      if (error) throw error;
      setSelectedServiceIds(data?.map(ms => ms.service_id) || []);
    } catch (error) {
      console.error('Error loading staff services:', error);
      setSelectedServiceIds([]);
    }

    setIsDialogOpen(true);
  };

  const handleDelete = async (staffId: string) => {
    triggerHaptic('medium');
    
    if (!confirm('Vai tiešām vēlaties dzēst šo meistaru?')) return;

    try {
      // master_services will be deleted automatically due to CASCADE
      // Just soft-delete the staff member
      const { error } = await supabase
        .from('staff_members')
        .update({ is_active: false })
        .eq('id', staffId);

      if (error) throw error;
      toast.success('Meistars dzēsts');
      loadStaffMembers();
    } catch (error) {
      console.error('Error deleting staff member:', error);
      toast.error('Neizdevās dzēst meistaru');
    }
  };

  const openDialog = () => {
    setEditingStaff(null);
    setFormData({ name: '', position: '', avatar: '' });
    setSelectedServiceIds([]);
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
                <div>
                  <Label>Pakalpojumi</Label>
                  {services.length === 0 ? (
                    <p className="text-sm text-muted-foreground mt-2">
                      Nav pieejamu pakalpojumu. Vispirms pievienojiet pakalpojumus.
                    </p>
                  ) : (
                    <div className="space-y-2 mt-2 max-h-48 overflow-y-auto border rounded-md p-3">
                      {services.map((service) => (
                        <div key={service.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={service.id}
                            checked={selectedServiceIds.includes(service.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedServiceIds([...selectedServiceIds, service.id]);
                              } else {
                                setSelectedServiceIds(selectedServiceIds.filter(id => id !== service.id));
                              }
                            }}
                          />
                          <label
                            htmlFor={service.id}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {service.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
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
