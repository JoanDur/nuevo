import { useContext, useState } from 'react';
import { AuthContext } from '@/App';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, PawPrint, Heart, Calendar, MessageCircle, Home } from 'lucide-react';
import FoundationDashboard from './FoundationDashboard';
import AdopterDashboard from './AdopterDashboard';
import MatchesList from './MatchesList';
import AppointmentsList from './AppointmentsList';

const Dashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('home');

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-purple-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-pink-400 to-purple-500 p-2 rounded-xl">
                <PawPrint className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                  TinderPets
                </h1>
                <p className="text-xs text-gray-600">{user?.user_type === 'foundation' ? 'Fundación' : 'Adoptante'}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="font-semibold text-gray-800">{user?.name}</p>
                <p className="text-sm text-gray-600">{user?.email}</p>
              </div>
              <Button variant="outline" onClick={logout} size="sm" data-testid="logout-btn">
                <LogOut className="w-4 h-4 mr-2" />
                Salir
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 max-w-2xl mx-auto">
            <TabsTrigger value="home" data-testid="tab-home">
              <Home className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Inicio</span>
            </TabsTrigger>
            <TabsTrigger value="matches" data-testid="tab-matches">
              <Heart className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Matches</span>
            </TabsTrigger>
            <TabsTrigger value="appointments" data-testid="tab-appointments">
              <Calendar className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Citas</span>
            </TabsTrigger>
            <TabsTrigger value="chat" data-testid="tab-chat">
              <MessageCircle className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Chat</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="home" className="space-y-6">
            {user?.user_type === 'foundation' ? <FoundationDashboard /> : <AdopterDashboard />}
          </TabsContent>

          <TabsContent value="matches">
            <MatchesList />
          </TabsContent>

          <TabsContent value="appointments">
            <AppointmentsList />
          </TabsContent>

          <TabsContent value="chat">
            <div className="bg-white rounded-2xl p-8 text-center">
              <MessageCircle className="w-16 h-16 mx-auto mb-4 text-purple-400" />
              <h3 className="text-xl font-semibold mb-2">Chat próximamente</h3>
              <p className="text-gray-600">Selecciona un match para iniciar una conversación</p>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;