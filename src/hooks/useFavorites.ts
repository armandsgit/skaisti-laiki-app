import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

export const useFavorites = () => {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch user's favorites
  const fetchFavorites = useCallback(async () => {
    if (!user) {
      setFavorites([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('professional_id')
        .eq('client_id', user.id);

      if (error) throw error;

      setFavorites(data?.map(f => f.professional_id) || []);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  // Check if a professional is favorited
  const isFavorite = useCallback((professionalId: string) => {
    return favorites.includes(professionalId);
  }, [favorites]);

  // Add to favorites
  const addFavorite = useCallback(async (professionalId: string) => {
    if (!user) {
      toast.error('Lūdzu, piesakieties, lai pievienotu iecienītākos');
      return false;
    }

    try {
      const { error } = await supabase
        .from('favorites')
        .insert({
          client_id: user.id,
          professional_id: professionalId
        });

      if (error) {
        if (error.code === '23505') {
          // Already favorited
          return true;
        }
        throw error;
      }

      setFavorites(prev => [...prev, professionalId]);
      toast.success('Pievienots iecienītākajiem');
      return true;
    } catch (error) {
      console.error('Error adding favorite:', error);
      toast.error('Neizdevās pievienot iecienītākajiem');
      return false;
    }
  }, [user]);

  // Remove from favorites
  const removeFavorite = useCallback(async (professionalId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('client_id', user.id)
        .eq('professional_id', professionalId);

      if (error) throw error;

      setFavorites(prev => prev.filter(id => id !== professionalId));
      toast.success('Noņemts no iecienītākajiem');
      return true;
    } catch (error) {
      console.error('Error removing favorite:', error);
      toast.error('Neizdevās noņemt no iecienītākajiem');
      return false;
    }
  }, [user]);

  // Toggle favorite
  const toggleFavorite = useCallback(async (professionalId: string) => {
    if (isFavorite(professionalId)) {
      return removeFavorite(professionalId);
    } else {
      return addFavorite(professionalId);
    }
  }, [isFavorite, addFavorite, removeFavorite]);

  return {
    favorites,
    loading,
    isFavorite,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    refetch: fetchFavorites
  };
};
