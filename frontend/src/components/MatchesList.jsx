import { useState, useEffect, useContext } from 'react';
import { AuthContext, API } from '@/App';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Heart, PawPrint, User, CheckCircle } from 'lucide-react';

const MatchesList = () => {
  const { token, user } = useContext(AuthContext);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      const response = await axios.get(`${API}/matches`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMatches(response.data);
    } catch (error) {
      toast.error('Error al cargar matches');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptMatch = async (matchId) => {
    try {
      await axios.put(`${API}/matches/${matchId}/accept`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Match aceptado! Ahora puedes coordinar la adopción');
      fetchMatches();
    } catch (error) {
      toast.error('Error al aceptar match');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Tus Matches</h2>
        <p className="text-gray-600 mt-1">Conexiones exitosas basadas en personalidad</p>
      </div>

      {matches.length === 0 ? (
        <Card className="border-2 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Heart className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-gray-500 text-center">No tienes matches aún.<br />¡Sigue buscando tu compañero perfecto!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {matches.map((match) => (
            <Card key={match.id} className="overflow-hidden hover:shadow-lg transition-shadow" data-testid={`match-card-${match.id}`}>
              <div className="grid grid-cols-2 gap-4 p-6 bg-gradient-to-br from-purple-50 to-pink-50">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-purple-200 to-pink-200 flex items-center justify-center mb-2">
                    <PawPrint className="w-10 h-10 text-purple-600" />
                  </div>
                  <p className="font-semibold">{match.pet?.name}</p>
                  <p className="text-sm text-gray-600">{match.pet?.breed}</p>
                </div>
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-blue-200 to-indigo-200 flex items-center justify-center mb-2">
                    <User className="w-10 h-10 text-blue-600" />
                  </div>
                  <p className="font-semibold">{match.user?.name}</p>
                  <p className="text-sm text-gray-600">{match.user?.email}</p>
                </div>
              </div>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Compatibilidad</span>
                  <span className="text-2xl font-bold text-purple-600">{match.match_score}%</span>
                </CardTitle>
                <CardDescription>
                  Match creado el {new Date(match.created_at).toLocaleDateString('es-ES')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-4">
                  <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    match.status === 'accepted' ? 'bg-green-100 text-green-700' :
                    match.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {match.status === 'accepted' ? 'Aceptado' :
                     match.status === 'pending' ? 'Pendiente' :
                     'Rechazado'}
                  </div>
                </div>
                {match.status === 'pending' && user?.user_type === 'adopter' && (
                  <Button onClick={() => handleAcceptMatch(match.id)} className="w-full" data-testid={`accept-match-btn-${match.id}`}>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Aceptar y Continuar
                  </Button>
                )}
                {match.status === 'accepted' && (
                  <p className="text-sm text-gray-600 text-center">Usa el chat para coordinar la adopción</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MatchesList;