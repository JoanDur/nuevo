import { useState, useEffect, useContext } from 'react';
import { AuthContext, API } from '@/App';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, PawPrint } from 'lucide-react';

const FoundationDashboard = () => {
  const { token } = useContext(AuthContext);
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPet, setEditingPet] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    breed: '',
    age: 0,
    images: [''],
    personality_traits: {
      playful: 5,
      calm: 5,
      energetic: 5,
      friendly: 5,
      independent: 5,
      social: 5
    },
    status: 'available'
  });

  useEffect(() => {
    fetchPets();
  }, []);

  const fetchPets = async () => {
    try {
      const response = await axios.get(`${API}/pets`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPets(response.data);
    } catch (error) {
      toast.error('Error al cargar mascotas');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        images: formData.images.filter(img => img.trim() !== '')
      };

      if (editingPet) {
        await axios.put(`${API}/pets/${editingPet.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Mascota actualizada exitosamente');
      } else {
        await axios.post(`${API}/pets`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Mascota creada exitosamente');
      }
      setDialogOpen(false);
      setEditingPet(null);
      resetForm();
      fetchPets();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar mascota');
    }
  };

  const handleDelete = async (petId) => {
    if (!window.confirm('¿Estás seguro de eliminar esta mascota?')) return;
    
    try {
      await axios.delete(`${API}/pets/${petId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Mascota eliminada');
      fetchPets();
    } catch (error) {
      toast.error('Error al eliminar mascota');
    }
  };

  const openEditDialog = (pet) => {
    setEditingPet(pet);
    setFormData({
      name: pet.name,
      breed: pet.breed,
      age: pet.age,
      images: pet.images.length > 0 ? pet.images : [''],
      personality_traits: pet.personality_traits,
      status: pet.status
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      breed: '',
      age: 0,
      images: [''],
      personality_traits: {
        playful: 5,
        calm: 5,
        energetic: 5,
        friendly: 5,
        independent: 5,
        social: 5
      },
      status: 'available'
    });
  };

  if (loading) {
    return <div className="text-center py-8">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Mis Mascotas</h2>
          <p className="text-gray-600 mt-1">Gestiona las mascotas de tu fundación</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingPet(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2" data-testid="add-pet-btn">
              <Plus className="w-4 h-4" />
              Nueva Mascota
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPet ? 'Editar Mascota' : 'Nueva Mascota'}</DialogTitle>
              <DialogDescription>Completa la información de la mascota</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pet-name">Nombre</Label>
                  <Input
                    id="pet-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    data-testid="pet-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pet-breed">Raza</Label>
                  <Input
                    id="pet-breed"
                    value={formData.breed}
                    onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                    required
                    data-testid="pet-breed-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pet-age">Edad (años)</Label>
                  <Input
                    id="pet-age"
                    type="number"
                    min="0"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) })}
                    required
                    data-testid="pet-age-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pet-status">Estado</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger id="pet-status" data-testid="pet-status-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Disponible</SelectItem>
                      <SelectItem value="adopted">Adoptado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Imagen URL</Label>
                {formData.images.map((img, idx) => (
                  <Input
                    key={idx}
                    placeholder="https://ejemplo.com/imagen.jpg"
                    value={img}
                    onChange={(e) => {
                      const newImages = [...formData.images];
                      newImages[idx] = e.target.value;
                      setFormData({ ...formData, images: newImages });
                    }}
                    data-testid={`pet-image-input-${idx}`}
                  />
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData({ ...formData, images: [...formData.images, ''] })}
                >
                  + Añadir otra imagen
                </Button>
              </div>

              <div className="space-y-4 p-4 bg-purple-50 rounded-lg">
                <Label className="text-sm font-semibold">Personalidad de la Mascota (1-10)</Label>
                {Object.keys(formData.personality_traits).map((trait) => (
                  <div key={trait} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="capitalize">{trait === 'playful' ? 'Juguetón' : trait === 'calm' ? 'Calmado' : trait === 'energetic' ? 'Energético' : trait === 'friendly' ? 'Amigable' : trait === 'independent' ? 'Independiente' : 'Social'}</span>
                      <span className="font-semibold">{formData.personality_traits[trait]}</span>
                    </div>
                    <Slider
                      min={1}
                      max={10}
                      step={1}
                      value={[formData.personality_traits[trait]]}
                      onValueChange={(value) => setFormData({
                        ...formData,
                        personality_traits: { ...formData.personality_traits, [trait]: value[0] }
                      })}
                      data-testid={`pet-trait-${trait}-slider`}
                    />
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1" data-testid="pet-submit-btn">
                  {editingPet ? 'Actualizar' : 'Crear'} Mascota
                </Button>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {pets.length === 0 ? (
        <Card className="border-2 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <PawPrint className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-gray-500 text-center">No tienes mascotas registradas.<br />¡Crea tu primera mascota!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pets.map((pet) => (
            <Card key={pet.id} className="overflow-hidden hover:shadow-lg transition-shadow" data-testid={`pet-card-${pet.id}`}>
              <div className="aspect-video bg-gradient-to-br from-purple-100 to-pink-100 relative">
                {pet.images.length > 0 && pet.images[0] ? (
                  <img src={pet.images[0]} alt={pet.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <PawPrint className="w-16 h-16 text-purple-300" />
                  </div>
                )}
                <div className={`absolute top-2 right-2 px-3 py-1 rounded-full text-xs font-semibold ${
                  pet.status === 'available' ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'
                }`}>
                  {pet.status === 'available' ? 'Disponible' : 'Adoptado'}
                </div>
              </div>
              <CardHeader>
                <CardTitle className="text-xl">{pet.name}</CardTitle>
                <CardDescription>{pet.breed} • {pet.age} {pet.age === 1 ? 'año' : 'años'}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEditDialog(pet)} className="flex-1" data-testid={`edit-pet-btn-${pet.id}`}>
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(pet.id)} data-testid={`delete-pet-btn-${pet.id}`}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default FoundationDashboard;