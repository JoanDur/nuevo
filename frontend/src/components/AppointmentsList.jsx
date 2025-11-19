import { useState, useEffect, useContext } from 'react';
import { AuthContext, API } from '@/App';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Calendar, Plus } from 'lucide-react';

const AppointmentsList = () => {
  const { token, user } = useContext(AuthContext);
  const [appointments, setAppointments] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    match_id: '',
    date: '',
    time: ''
  });

  useEffect(() => {
    fetchAppointments();
    fetchMatches();
  }, []);

  const fetchAppointments = async () => {
    try {
      const response = await axios.get(`${API}/appointments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAppointments(response.data);
    } catch (error) {
      toast.error('Error al cargar citas');
    } finally {
      setLoading(false);
    }
  };

  const fetchMatches = async () => {
    try {
      const response = await axios.get(`${API}/matches`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMatches(response.data.filter(m => m.status === 'accepted'));
    } catch (error) {
      console.error('Error fetching matches:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/appointments`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Cita creada exitosamente');
      setDialogOpen(false);
      setFormData({ match_id: '', date: '', time: '' });
      fetchAppointments();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al crear cita');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Citas de Adopción</h2>
          <p className="text-gray-600 mt-1">Gestiona tus citas programadas</p>
        </div>
        {matches.length > 0 && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" data-testid="create-appointment-btn">
                <Plus className="w-4 h-4" />
                Nueva Cita
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Programar Cita</DialogTitle>
                <DialogDescription>Coordina una fecha para conocer a tu futuro compañero</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="match">Match</Label>
                  <Select
                    value={formData.match_id}
                    onValueChange={(value) => setFormData({ ...formData, match_id: value })}
                    required
                  >
                    <SelectTrigger id="match" data-testid="appointment-match-select">
                      <SelectValue placeholder="Selecciona un match" />
                    </SelectTrigger>
                    <SelectContent>
                      {matches.map((match) => (
                        <SelectItem key={match.id} value={match.id}>
                          {match.pet?.name} - {match.user?.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Fecha</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                    data-testid="appointment-date-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Hora</Label>
                  <Input
                    id="time"
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    required
                    data-testid="appointment-time-input"
                  />
                </div>
                <Button type="submit" className="w-full" data-testid="appointment-submit-btn">
                  Crear Cita
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {appointments.length === 0 ? (
        <Card className="border-2 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-gray-500 text-center">No hay citas programadas.<br />Crea una cita con tus matches aceptados</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {appointments.map((apt) => (
            <Card key={apt.id} className="hover:shadow-lg transition-shadow" data-testid={`appointment-card-${apt.id}`}>
              <CardHeader>
                <CardTitle className="text-lg">{apt.pet?.name}</CardTitle>
                <CardDescription>con {apt.user?.name}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-purple-500" />
                  <span className="font-medium">{apt.date} a las {apt.time}</span>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-semibold inline-block ${
                  apt.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                  apt.status === 'completed' ? 'bg-green-100 text-green-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {apt.status === 'scheduled' ? 'Programada' :
                   apt.status === 'completed' ? 'Completada' :
                   'Cancelada'}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AppointmentsList;