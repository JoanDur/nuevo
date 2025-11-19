import { useState, useEffect, useContext } from 'react';
import { AuthContext, API } from '@/App';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Heart, X, PawPrint, Sparkles } from 'lucide-react';

const AdopterDashboard = () => {
  const { token, user } = useContext(AuthContext);
  const [pets, setPets] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [swiping, setSwiping] = useState(null);

  useEffect(() => {
    fetchAvailablePets();
  }, []);

  const fetchAvailablePets = async () => {
    try {
      const response = await axios.get(`${API}/pets/available/list`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPets(response.data);
    } catch (error) {
      toast.error('Error al cargar mascotas');
    } finally {
      setLoading(false);
    }
  };

  const handleSwipe = async (action) => {
    if (!user?.personality_traits) {
      toast.error('Por favor completa tu perfil de personalidad primero');
      return;
    }

    const currentPet = pets[currentIndex];
    setSwiping(action);

    try {
      const response = await axios.post(
        `${API}/matches/like`,
        { pet_id: currentPet.id, action },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.is_match) {
        toast.success(`¡Es un Match! Compatibilidad: ${response.data.match_score}%`, {
          duration: 4000,
          icon: '🎉'
        });
      } else if (action === 'like') {
        toast.info(`Compatibilidad: ${response.data.match_score}% - No es suficiente para match (necesita ≥70%)`);
      }

      setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
        setSwiping(null);
      }, 500);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al procesar');
      setSwiping(null);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Cargando...</div>;
  }

  if (!user?.personality_traits) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="py-12 text-center">
          <Sparkles className="w-16 h-16 mx-auto mb-4 text-purple-400" />
          <h3 className="text-xl font-semibold mb-2">Completa tu perfil</h3>
          <p className="text-gray-600 mb-4">Para encontrar tu mascota ideal, necesitamos conocer tu personalidad</p>
          <Button onClick={() => window.location.reload()}>Actualizar Perfil</Button>
        </CardContent>
      </Card>
    );
  }

  if (currentIndex >= pets.length) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="py-12 text-center">
          <PawPrint className="w-16 h-16 mx-auto mb-4 text-purple-400" />
          <h3 className="text-xl font-semibold mb-2">No hay más mascotas por ahora</h3>
          <p className="text-gray-600 mb-4">¡Vuelve pronto para ver nuevos amigos!</p>
          <Button onClick={fetchAvailablePets}>Recargar</Button>
        </CardContent>
      </Card>
    );
  }

  const currentPet = pets[currentIndex];

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900">Encuentra tu Match</h2>
        <p className="text-gray-600 mt-1">{pets.length - currentIndex} mascotas disponibles</p>
      </div>

      <Card
        className={`overflow-hidden shadow-2xl swipe-card ${
          swiping === 'like' ? 'swipe-right' : swiping === 'pass' ? 'swipe-left' : ''
        }`}
        data-testid="swipe-card"
      >
        <div className="aspect-[3/4] bg-gradient-to-br from-purple-100 to-pink-100 relative">
          {currentPet.images.length > 0 && currentPet.images[0] ? (
            <img src={currentPet.images[0]} alt={currentPet.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <PawPrint className="w-24 h-24 text-purple-300" />
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 text-white">
            <h3 className="text-3xl font-bold mb-2">{currentPet.name}</h3>
            <p className="text-lg">{currentPet.breed} • {currentPet.age} {currentPet.age === 1 ? 'año' : 'años'}</p>
          </div>
        </div>

        <CardContent className="p-6">
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-700">Personalidad:</h4>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(currentPet.personality_traits).map(([trait, value]) => (
                <div key={trait} className="bg-purple-50 rounded-lg p-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm capitalize">
                      {trait === 'playful' ? 'Juguetón' : trait === 'calm' ? 'Calmado' : trait === 'energetic' ? 'Energético' : trait === 'friendly' ? 'Amigable' : trait === 'independent' ? 'Independiente' : 'Social'}
                    </span>
                    <span className="text-sm font-bold text-purple-600">{value}/10</span>
                  </div>
                  <div className="w-full bg-purple-200 rounded-full h-1.5 mt-2">
                    <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${value * 10}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center gap-6">
        <Button
          size="lg"
          variant="outline"
          className="w-20 h-20 rounded-full border-2 border-red-300 hover:bg-red-50 hover:border-red-400"
          onClick={() => handleSwipe('pass')}
          disabled={swiping !== null}
          data-testid="pass-btn"
        >
          <X className="w-8 h-8 text-red-500" />
        </Button>
        <Button
          size="lg"
          className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 hover:from-pink-500 hover:to-purple-600"
          onClick={() => handleSwipe('like')}
          disabled={swiping !== null}
          data-testid="like-btn"
        >
          <Heart className="w-8 h-8 text-white" />
        </Button>
      </div>
    </div>
  );
};

export default AdopterDashboard;