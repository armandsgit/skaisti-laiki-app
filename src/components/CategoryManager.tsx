import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  display_order: number;
  active: boolean;
}

const CategoryManager = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCategory, setNewCategory] = useState({ name: '', icon: '✨', color: '#ec4899' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', icon: '', color: '' });
  const { toast } = useToast();

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('display_order');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast({
        title: 'Kļūda',
        description: 'Neizdevās ielādēt kategorijas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newCategory.name.trim()) {
      toast({
        title: 'Kļūda',
        description: 'Lūdzu ievadiet kategorijas nosaukumu',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase.from('categories').insert({
        name: newCategory.name.trim(),
        icon: newCategory.icon,
        color: newCategory.color,
        display_order: categories.length,
        active: true,
      });

      if (error) throw error;

      toast({
        title: 'Veiksmīgi',
        description: 'Kategorija pievienota',
      });

      setNewCategory({ name: '', icon: '✨', color: '#ec4899' });
      loadCategories();
    } catch (error) {
      console.error('Error adding category:', error);
      toast({
        title: 'Kļūda',
        description: 'Neizdevās pievienot kategoriju',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (category: Category) => {
    setEditingId(category.id);
    setEditForm({
      name: category.name,
      icon: category.icon,
      color: category.color,
    });
  };

  const handleSaveEdit = async (id: string) => {
    try {
      const { error } = await supabase
        .from('categories')
        .update({
          name: editForm.name,
          icon: editForm.icon,
          color: editForm.color,
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Veiksmīgi',
        description: 'Kategorija atjaunināta',
      });

      setEditingId(null);
      loadCategories();
    } catch (error) {
      console.error('Error updating category:', error);
      toast({
        title: 'Kļūda',
        description: 'Neizdevās atjaunināt kategoriju',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Vai tiešām vēlaties dzēst šo kategoriju?')) return;

    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);

      if (error) throw error;

      toast({
        title: 'Veiksmīgi',
        description: 'Kategorija dzēsta',
      });

      loadCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({
        title: 'Kļūda',
        description: 'Neizdevās dzēst kategoriju',
        variant: 'destructive',
      });
    }
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from('categories')
        .update({ active: !currentActive })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Veiksmīgi',
        description: currentActive ? 'Kategorija deaktivizēta' : 'Kategorija aktivizēta',
      });

      loadCategories();
    } catch (error) {
      console.error('Error toggling category:', error);
      toast({
        title: 'Kļūda',
        description: 'Neizdevās mainīt kategorijas statusu',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <div>Ielādē...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kategoriju pārvaldība</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new category */}
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="text-sm font-medium mb-1 block">Nosaukums</label>
            <Input
              value={newCategory.name}
              onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
              placeholder="Kategorijas nosaukums"
            />
          </div>
          <div className="w-24">
            <label className="text-sm font-medium mb-1 block">
              Ikona
              <a 
                href="https://emojipedia.org/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline ml-1"
              >
                📝
              </a>
            </label>
            <Input
              value={newCategory.icon}
              onChange={(e) => setNewCategory({ ...newCategory, icon: e.target.value })}
              placeholder="✨"
              maxLength={2}
            />
          </div>
          <div className="w-24">
            <label className="text-sm font-medium mb-1 block">Krāsa</label>
            <Input
              type="color"
              value={newCategory.color}
              onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
            />
          </div>
          <Button onClick={handleAdd}>
            <Plus className="w-4 h-4 mr-2" />
            Pievienot
          </Button>
        </div>

        {/* Categories list */}
        <div className="space-y-2">
          {categories.map((category) => (
            <div
              key={category.id}
              className="flex items-center gap-2 p-3 border rounded-lg"
              style={{ opacity: category.active ? 1 : 0.5 }}
            >
              {editingId === category.id ? (
                <>
                  <Input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="flex-1"
                  />
                  <Input
                    value={editForm.icon}
                    onChange={(e) => setEditForm({ ...editForm, icon: e.target.value })}
                    className="w-20"
                    maxLength={2}
                  />
                  <Input
                    type="color"
                    value={editForm.color}
                    onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                    className="w-20"
                  />
                  <Button size="sm" onClick={() => handleSaveEdit(category.id)}>
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="text-2xl">{category.icon}</span>
                  <span className="flex-1 font-medium">{category.name}</span>
                  <div
                    className="w-8 h-8 rounded-full border-2 border-white"
                    style={{ backgroundColor: category.color }}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleActive(category.id, category.active)}
                  >
                    {category.active ? 'Deaktivizēt' : 'Aktivizēt'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleEdit(category)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(category.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default CategoryManager;
