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
  serviceName?: string;
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
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    position: '',
    avatar: '',
    showOnProfile: true,
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
      const { data: staffData, error } = await supabase
        .from('staff_members')
        .select('*, show_on_profile')
        .eq('professional_id', professionalId)
        .eq('is_active', true)
        .order('created_at');

      if (error) throw error;

      // Load service information for each staff member
      const staffWithServices = await Promise.all(
        (staffData || []).map(async (staff) => {
          const { data: masterService } = await supabase
            .from('master_services')
            .select('service_id')
            .eq('staff_member_id', staff.id)
            .maybeSingle();

          if (masterService?.service_id) {
            const { data: service } = await supabase
              .from('services')
              .select('name')
              .eq('id', masterService.service_id)
              .single();

            return {
              ...staff,
              serviceName: service?.name
            };
          }

          return staff;
        })
      );

      setStaffMembers(staffWithServices);
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
            show_on_profile: formData.showOnProfile,
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
            show_on_profile: formData.showOnProfile,
          })
          .select()
          .single();

        if (error) throw error;
        staffId = data.id;
        toast.success('Meistars pievienots');
      }

      // Assign service to staff member
      if (selectedServiceId) {
        const { error: masterServicesError } = await supabase
          .from('master_services')
          .insert({
            staff_member_id: staffId,
            service_id: selectedServiceId
          });

        if (masterServicesError) throw masterServicesError;
      }

      setIsDialogOpen(false);
      setEditingStaff(null);
      setFormData({ name: '', position: '', avatar: '', showOnProfile: true });
      setSelectedServiceId(null);
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
      showOnProfile: (staff as any).show_on_profile ?? true,
    });

    // Load staff member's current service (only one)
    try {
      const { data, error } = await supabase
        .from('master_services')
        .select('service_id')
        .eq('staff_member_id', staff.id)
        .maybeSingle();

      if (error) throw error;
      setSelectedServiceId(data?.service_id || null);
    } catch (error) {
      console.error('Error loading staff service:', error);
      setSelectedServiceId(null);
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
    setFormData({ name: '', position: '', avatar: '', showOnProfile: true });
    setSelectedServiceId(null);
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
                
                {/* Show on Profile Toggle */}
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border/40">
                  <div className="flex-1">
                    <Label htmlFor="showOnProfile" className="text-sm font-semibold">
                      Rādīt publiskajā profilā
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Vai šis meistars būs redzams klientiem profilā
                    </p>
                  </div>
                  <div
                    onClick={() => {
                      triggerHaptic('light');
                      setFormData({ ...formData, showOnProfile: !formData.showOnProfile });
                    }}
                    className={`
                      w-14 h-7 rounded-full relative flex-shrink-0 cursor-pointer ml-3
                      transition-all duration-300 ease-out
                      ${formData.showOnProfile
                        ? 'bg-black'
                        : 'bg-gray-300'
                      }
                    `}
                  >
                    <div
                      className={`
                        absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md
                        transition-all duration-300 ease-out
                        ${formData.showOnProfile ? 'left-[calc(100%-24px-2px)]' : 'left-0.5'}
                      `}
                    />
                  </div>
                </div>

                <div>
                  <Label>Pakalpojumi</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Atlasiet pakalpojumu, ko šis meistars piedāvā
                  </p>
                  {services.length === 0 ? (
                    <p className="text-sm text-muted-foreground mt-2">
                      Nav pieejamu pakalpojumu. Vispirms pievienojiet pakalpojumus.
                    </p>
                  ) : (
                    <div className="space-y-2 mt-3">
                      {services.map((service) => {
                        const isSelected = selectedServiceId === service.id;
                        return (
                          <div
                            key={service.id}
                            onClick={() => {
                              triggerHaptic('light');
                              setSelectedServiceId(service.id);
                            }}
                            className={`
                              flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer
                              transition-all duration-200 active:scale-[0.98]
                              ${isSelected
                                ? 'border-black bg-black/5 shadow-sm'
                                : 'border-gray-200 bg-white hover:border-black/40 hover:bg-gray-50'
                              }
                            `}
                          >
                            {/* Radio Button */}
                            <div
                              className={`
                                w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center
                                transition-all duration-200
                                ${isSelected
                                  ? 'border-primary bg-primary'
                                  : 'border-gray-300'
                                }
                              `}
                            >
                              {isSelected && (
                                <div className="w-3 h-3 rounded-full bg-white animate-in zoom-in duration-200" />
                              )}
                            </div>

                            {/* Service Name */}
                            <label
                              className={`
                                text-base font-medium cursor-pointer select-none
                                transition-colors duration-200
                                ${isSelected ? 'text-foreground' : 'text-muted-foreground'}
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
                  {staff.serviceName && (
                    <p className="text-xs text-primary font-medium mt-1 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      {staff.serviceName}
                    </p>
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
