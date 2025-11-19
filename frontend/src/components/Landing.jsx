import { useState } from 'react';
import { useContext } from 'react';
import { AuthContext, API } from '@/App';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { Heart, PawPrint, Sparkles } from 'lucide-react';

const Landing = () => {
  const { login } = useContext(AuthContext);
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  // Login state
  const [loginData, setLoginData] = useState({ email: '', password: '' });

  // Register state
  const [registerData, setRegisterData] = useState({
    email: '',
    password: '',
    name: '',
    age: 18,
    user_type: 'adopter',
    personality_traits: {
      playful: 5,
      calm: 5,
      energetic: 5,
      friendly: 5,
      independent: 5,
      social: 5
    }
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/login`, loginData);
      login(response.data.token, response.data.user);
      toast.success('¡Bienvenido de nuevo!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/register`, registerData);
      login(response.data.token, response.data.user);
      toast.success('¡Cuenta creada exitosamente!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Hero Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-pink-400 to-purple-500 p-3 rounded-2xl">
              <PawPrint className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent">
              TinderPets
            </h1>
          </div>
          <p className="text-base sm:text-lg text-gray-700 leading-relaxed">
            Encuentra tu compañero perfecto a través de la compatibilidad de personalidades.
            Conectamos mascotas con familias ideales usando un algoritmo inteligente de matching.
          </p>
          <div className="flex flex-wrap gap-4 pt-4">
            <div className="flex items-center gap-2 bg-white/70 backdrop-blur-sm px-4 py-2 rounded-full">
              <Heart className="w-5 h-5 text-pink-500" />
              <span className="text-sm font-medium">Match por Personalidad</span>
            </div>
            <div className="flex items-center gap-2 bg-white/70 backdrop-blur-sm px-4 py-2 rounded-full">
              <Sparkles className="w-5 h-5 text-purple-500" />
              <span className="text-sm font-medium">Adopción Responsable</span>
            </div>
          </div>
        </div>

        {/* Auth Section */}
        <Card className="border-0 shadow-2xl" data-testid="auth-card">
          <CardHeader>
            <CardTitle className="text-2xl">Comienza tu historia</CardTitle>
            <CardDescription>Únete a nuestra comunidad de amantes de mascotas</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={isLogin ? 'login' : 'register'} onValueChange={(v) => setIsLogin(v === 'login')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login" data-testid="login-tab">Iniciar Sesión</TabsTrigger>
                <TabsTrigger value="register" data-testid="register-tab">Registrarse</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="tu@email.com"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      required
                      data-testid="login-email-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Contraseña</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      required
                      data-testid="login-password-input"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading} data-testid="login-submit-btn">
                    {loading ? 'Cargando...' : 'Iniciar Sesión'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nombre</Label>
                      <Input
                        id="name"
                        placeholder="Juan Pérez"
                        value={registerData.name}
                        onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                        required
                        data-testid="register-name-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="age">Edad</Label>
                      <Input
                        id="age"
                        type="number"
                        min="18"
                        value={registerData.age}
                        onChange={(e) => setRegisterData({ ...registerData, age: parseInt(e.target.value) })}
                        required
                        data-testid="register-age-input"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="tu@email.com"
                      value={registerData.email}
                      onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                      required
                      data-testid="register-email-input"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Contraseña</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={registerData.password}
                      onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                      required
                      data-testid="register-password-input"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="user-type">Tipo de Usuario</Label>
                    <Select
                      value={registerData.user_type}
                      onValueChange={(value) => setRegisterData({ ...registerData, user_type: value })}
                    >
                      <SelectTrigger id="user-type" data-testid="register-usertype-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="adopter" data-testid="usertype-adopter">Adoptante</SelectItem>
                        <SelectItem value="foundation" data-testid="usertype-foundation">Fundación</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {registerData.user_type === 'adopter' && (
                    <div className="space-y-4 p-4 bg-purple-50 rounded-lg">
                      <Label className="text-sm font-semibold">Tu Personalidad (1-10)</Label>
                      <div className="space-y-3">
                        {Object.keys(registerData.personality_traits).map((trait) => (
                          <div key={trait} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="capitalize">{trait === 'playful' ? 'Juguetón' : trait === 'calm' ? 'Calmado' : trait === 'energetic' ? 'Energético' : trait === 'friendly' ? 'Amigable' : trait === 'independent' ? 'Independiente' : 'Social'}</span>
                              <span className="font-semibold">{registerData.personality_traits[trait]}</span>
                            </div>
                            <Slider
                              min={1}
                              max={10}
                              step={1}
                              value={[registerData.personality_traits[trait]]}
                              onValueChange={(value) => setRegisterData({
                                ...registerData,
                                personality_traits: { ...registerData.personality_traits, [trait]: value[0] }
                              })}
                              data-testid={`register-trait-${trait}-slider`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button type="submit" className="w-full" disabled={loading} data-testid="register-submit-btn">
                    {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Landing;