import { supabase } from '@/integrations/supabase/client';

export const loadAvailableStaff = async (
  serviceId: string,
  professionalId: string,
  setAvailableStaff: (staff: any[]) => void,
  setSelectedStaffMember: (id: string) => void
) => {
  try {
    // Get the service to check if it's assigned to a specific staff member
    const { data: serviceData, error: serviceError } = await supabase
      .from('services')
      .select('staff_member_id')
      .eq('id', serviceId)
      .single();

    if (serviceError) throw serviceError;

    if (serviceData.staff_member_id) {
      // Service is assigned to a specific staff member
      const { data: staffData, error: staffError } = await supabase
        .from('staff_members')
        .select('*')
        .eq('id', serviceData.staff_member_id)
        .eq('is_active', true)
        .single();

      if (staffError) throw staffError;
      
      if (staffData) {
        setAvailableStaff([staffData]);
        setSelectedStaffMember(staffData.id);
      }
    } else {
      // Service is not assigned to any specific staff, show all staff from this professional
      const { data: allStaff, error: staffError } = await supabase
        .from('staff_members')
        .select('*')
        .eq('professional_id', professionalId)
        .eq('is_active', true);

      if (staffError) throw staffError;
      
      setAvailableStaff(allStaff || []);
      
      // Auto-select if only one staff member
      if (allStaff && allStaff.length === 1) {
        setSelectedStaffMember(allStaff[0].id);
      }
    }
  } catch (error) {
    console.error('Error loading available staff:', error);
    setAvailableStaff([]);
  }
};
