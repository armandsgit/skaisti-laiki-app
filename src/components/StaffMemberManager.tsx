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

        // Delete previous service assignments
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

      // Assign services to staff member
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

    // Load staff member's current services
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
                  <p className="text-xs text-muted-foreground mb-2">
                    Atlasiet pakalpojumus, ko šis meistars piedāvā
                  </p>
                  {services.length === 0 ? (
                    <p className="text-sm text-muted-foreground mt-2">
                      Nav pieejamu pakalpojumu. Vispirms pievienojiet pakalpojumus.
                    </p>
                  ) : (
                    <div className="space-y-2 mt-3">
                      {services.map((service) => {
                        const isChecked = selectedServiceIds.includes(service.id);
                        return (
                          <div
                            key={service.id}
                            onClick={() => {
                              triggerHaptic('light');
                              if (isChecked) {
                                setSelectedServiceIds(selectedServiceIds.filter(id => id !== service.id));
                              } else {
                                setSelectedServiceIds([...selectedServiceIds, service.id]);
                              }
                            }}
                            className={`
                              flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer
                              transition-all duration-200 active:scale-[0.98]
                              ${isChecked
                                ? 'border-primary bg-gradient-to-r from-primary/10 to-secondary/10 shadow-sm'
                                : 'border-gray-200 bg-white hover:border-primary/40 hover:bg-gray-50'
                              }
                            `}
                          >
                            {/* Modern Pill Checkbox */}
                            <div
                              className={`
                                w-16 h-8 rounded-full relative flex-shrink-0
                                transition-all duration-300 ease-out
                                ${isChecked
                                  ? 'bg-gradient-to-r from-primary to-secondary'
                                  : 'bg-gray-300'
                                }
                              `}
                            >
                              <div
                                className={`
                                  absolute top-0.5 w-7 h-7 rounded-full bg-white shadow-md
                                  transition-all duration-300 ease-out flex items-center justify-center
                                  ${isChecked ? 'left-[calc(100%-28px-2px)]' : 'left-0.5'}
                                `}
                              >
                                {isChecked && (
                                  <svg
                                    className="w-4 h-4 text-primary animate-in zoom-in duration-200"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={3}
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                )}
                              </div>
                            </div>

                            {/* Service Name */}
                            <label
                              className={`
                                text-base font-medium cursor-pointer select-none
                                transition-colors duration-200
                                ${isChecked ? 'text-foreground' : 'text-muted-foreground'}
                              `}
                            >
                              {service.name}
                            </label>
                          </div>
                        );
                      })}
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
