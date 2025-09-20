import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Icon from '@/components/ui/icon';
import AuthModal from '@/components/AuthModal';

interface Project {
  id: number;
  title: string;
  description: string;
  budget: string;
  category: string;
  tags: string[];
  timePosted: string;
  proposals: number;
  client: {
    name: string;
    rating: number;
    verified: boolean;
  };
}

interface Freelancer {
  id: number;
  name: string;
  title: string;
  rating: number;
  hourlyRate: string;
  skills: string[];
  avatar: string;
  completedProjects: number;
  location: string;
}

interface User {
  id: number;
  email: string;
  userType: 'client' | 'freelancer';
  firstName: string;
  lastName: string;
  profileId?: number;
}

function Index() {
  const [currentLang, setCurrentLang] = useState<'ru' | 'en' | 'de'>('ru');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('projects');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [user, setUser] = useState<User | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  const translations = {
    ru: {
      title: 'FreelanceHub',
      subtitle: 'Биржа фриланса для профессионалов',
      search: 'Поиск проектов...',
      projects: 'Проекты',
      freelancers: 'Исполнители', 
      register: 'Регистрация',
      login: 'Войти',
      postProject: 'Разместить проект',
      allCategories: 'Все категории',
      budget: 'Бюджет',
      proposals: 'предложений',
      hourlyRate: 'в час',
      rating: 'Рейтинг',
      completed: 'завершено',
      verified: 'Проверен',
      viewProfile: 'Смотреть профиль',
      applyNow: 'Откликнуться',
      featuredProjects: 'Рекомендуемые проекты',
      topFreelancers: 'Топ исполнители'
    },
    en: {
      title: 'FreelanceHub',
      subtitle: 'Professional freelance marketplace', 
      search: 'Search projects...',
      projects: 'Projects',
      freelancers: 'Freelancers',
      register: 'Register',
      login: 'Login',
      postProject: 'Post Project',
      allCategories: 'All categories',
      budget: 'Budget',
      proposals: 'proposals',
      hourlyRate: 'per hour',
      rating: 'Rating',
      completed: 'completed',
      verified: 'Verified',
      viewProfile: 'View Profile',
      applyNow: 'Apply Now',
      featuredProjects: 'Featured Projects',
      topFreelancers: 'Top Freelancers'
    },
    de: {
      title: 'FreelanceHub',
      subtitle: 'Professioneller Freelance-Marktplatz',
      search: 'Projekte suchen...',
      projects: 'Projekte',
      freelancers: 'Freiberufler',
      register: 'Registrieren',
      login: 'Anmelden',
      postProject: 'Projekt posten',
      allCategories: 'Alle Kategorien',
      budget: 'Budget',
      proposals: 'Angebote',
      hourlyRate: 'pro Stunde',
      rating: 'Bewertung',
      completed: 'abgeschlossen',
      verified: 'Verifiziert',
      viewProfile: 'Profil ansehen',
      applyNow: 'Jetzt bewerben',
      featuredProjects: 'Empfohlene Projekte',
      topFreelancers: 'Top Freiberufler'
    }
  };

  const t = translations[currentLang];

  // Проверка сессии при загрузке
  useEffect(() => {
    const savedToken = localStorage.getItem('sessionToken');
    if (savedToken) {
      checkSession(savedToken);
    }
  }, []);

  const checkSession = async (token: string) => {
    try {
      const response = await fetch('https://functions.poehali.dev/1846285e-3b9e-4fb9-b7b2-f8fe7dd104f5', {
        method: 'GET',
        headers: {
          'X-Session-Token': token
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setSessionToken(token);
      } else {
        localStorage.removeItem('sessionToken');
      }
    } catch (error) {
      localStorage.removeItem('sessionToken');
    }
  };

  const handleAuthSuccess = (userData: User, token: string) => {
    setUser(userData);
    setSessionToken(token);
    localStorage.setItem('sessionToken', token);
  };

  const handleLogout = async () => {
    if (sessionToken) {
      try {
        await fetch('https://functions.poehali.dev/1846285e-3b9e-4fb9-b7b2-f8fe7dd104f5', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Session-Token': sessionToken
          },
          body: JSON.stringify({ action: 'logout' })
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    
    setUser(null);
    setSessionToken(null);
    localStorage.removeItem('sessionToken');
  };

  const openAuthModal = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  const sampleProjects: Project[] = [
    {
      id: 1,
      title: 'React веб-приложение для e-commerce',
      description: 'Требуется разработать современное веб-приложение на React с интеграцией платежных систем и админ-панелью.',
      budget: '$2,500 - $5,000',
      category: 'Веб-разработка',
      tags: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'],
      timePosted: '2 часа назад',
      proposals: 12,
      client: {
        name: 'DigitalStore Inc.',
        rating: 4.8,
        verified: true
      }
    },
    {
      id: 2,
      title: 'UI/UX дизайн мобильного приложения',
      description: 'Создание пользовательского интерфейса для финтех приложения. Нужны wireframes, UI kit и интерактивные прототипы.',
      budget: '$1,200 - $2,800',
      category: 'Дизайн',
      tags: ['Figma', 'UI/UX', 'Mobile Design', 'Prototyping'],
      timePosted: '4 часа назад',
      proposals: 8,
      client: {
        name: 'FinTech Solutions',
        rating: 4.9,
        verified: true
      }
    },
    {
      id: 3,
      title: 'SEO оптимизация и контент-маркетинг',
      description: 'Комплексная SEO оптимизация сайта и создание контент-стратегии для привлечения органического трафика.',
      budget: '$800 - $1,500',
      category: 'Маркетинг',
      tags: ['SEO', 'Content Marketing', 'Analytics', 'Keywords'],
      timePosted: '1 день назад',
      proposals: 15,
      client: {
        name: 'StartupHub',
        rating: 4.6,
        verified: false
      }
    }
  ];

  const sampleFreelancers: Freelancer[] = [
    {
      id: 1,
      name: 'Анна Петрова',
      title: 'Fullstack разработчик',
      rating: 4.9,
      hourlyRate: '$45',
      skills: ['React', 'Node.js', 'Python', 'AWS'],
      avatar: 'AP',
      completedProjects: 127,
      location: 'Москва, Россия'
    },
    {
      id: 2,
      name: 'Mark Thompson',
      title: 'UI/UX Designer',
      rating: 4.8,
      hourlyRate: '$38',
      skills: ['Figma', 'Adobe XD', 'Sketch', 'Prototyping'],
      avatar: 'MT',
      completedProjects: 89,
      location: 'London, UK'
    },
    {
      id: 3,
      name: 'Klaus Weber',
      title: 'Digital Marketing Specialist',
      rating: 4.7,
      hourlyRate: '$32',
      skills: ['SEO', 'Google Ads', 'Analytics', 'Content Strategy'],
      avatar: 'KW',
      completedProjects: 156,
      location: 'Berlin, Germany'
    }
  ];

  const ProjectCard = ({ project }: { project: Project }) => (
    <Card className="hover:shadow-lg transition-all duration-300 animate-fade-in group">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-4">
          <div>
            <CardTitle className="text-lg font-semibold text-primary-500 group-hover:text-primary-600 transition-colors">
              {project.title}
            </CardTitle>
            <CardDescription className="text-sm text-gray-500 mt-1">
              {project.timePosted} • {project.proposals} {t.proposals}
            </CardDescription>
          </div>
          {project.client.verified && (
            <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
              <Icon name="CheckCircle" size={12} className="mr-1" />
              {t.verified}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-gray-700 text-sm leading-relaxed">{project.description}</p>
        
        <div className="flex flex-wrap gap-2">
          {project.tags.map((tag, index) => (
            <Badge key={index} variant="outline" className="text-xs bg-gray-50">
              {tag}
            </Badge>
          ))}
        </div>
        
        <div className="flex justify-between items-center pt-3 border-t border-gray-100">
          <div>
            <p className="font-semibold text-primary-500">{project.budget}</p>
            <p className="text-xs text-gray-500">{project.client.name}</p>
          </div>
          <Button size="sm" className="bg-primary-500 hover:bg-primary-600 text-white">
            {t.applyNow}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const FreelancerCard = ({ freelancer }: { freelancer: Freelancer }) => (
    <Card className="hover:shadow-lg transition-all duration-300 animate-scale-in group">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src="" alt={freelancer.name} />
            <AvatarFallback className="bg-primary-100 text-primary-600 font-medium">
              {freelancer.avatar}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-primary-500 group-hover:text-primary-600 transition-colors">
              {freelancer.name}
            </CardTitle>
            <CardDescription className="text-sm text-gray-500">
              {freelancer.title}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Icon name="Star" size={16} className="text-yellow-400 fill-current" />
            <span className="font-medium">{freelancer.rating}</span>
          </div>
          <div className="text-right">
            <p className="font-semibold text-primary-500">{freelancer.hourlyRate}</p>
            <p className="text-xs text-gray-500">{t.hourlyRate}</p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {freelancer.skills.slice(0, 4).map((skill, index) => (
            <Badge key={index} variant="outline" className="text-xs bg-gray-50">
              {skill}
            </Badge>
          ))}
        </div>
        
        <div className="flex justify-between items-center pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            {freelancer.completedProjects} {t.completed}
          </p>
          <Button variant="outline" size="sm" className="border-primary-500 text-primary-500 hover:bg-primary-50">
            {t.viewProfile}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2">
                <Icon name="Briefcase" size={28} className="text-primary-500" />
                <h1 className="text-xl font-bold text-primary-500">{t.title}</h1>
              </div>
              <nav className="hidden md:flex items-center gap-6">
                <Button variant="ghost" className="text-gray-600 hover:text-primary-500">
                  {t.projects}
                </Button>
                <Button variant="ghost" className="text-gray-600 hover:text-primary-500">
                  {t.freelancers}
                </Button>
              </nav>
            </div>
            
            <div className="flex items-center gap-4">
              <Select value={currentLang} onValueChange={(value: 'ru' | 'en' | 'de') => setCurrentLang(value)}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ru">RU</SelectItem>
                  <SelectItem value="en">EN</SelectItem>
                  <SelectItem value="de">DE</SelectItem>
                </SelectContent>
              </Select>
              
              {user ? (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary-100 text-primary-600 text-sm">
                        {user.firstName[0]}{user.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-gray-700">
                      {user.firstName} {user.lastName}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {user.userType === 'client' ? 'Заказчик' : 'Исполнитель'}
                    </Badge>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleLogout}>
                    Выйти
                  </Button>
                </div>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={() => openAuthModal('login')}>
                    {t.login}
                  </Button>
                  <Button size="sm" className="bg-primary-500 hover:bg-primary-600 text-white" onClick={() => openAuthModal('register')}>
                    {t.register}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-50 to-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-primary-500 mb-4 animate-fade-in">
            {t.subtitle}
          </h2>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto animate-fade-in">
            Найдите идеальных исполнителей для ваших проектов или предложите свои услуги заказчикам по всему миру
          </p>
          
          <div className="max-w-2xl mx-auto animate-scale-in">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Icon name="Search" size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder={t.search}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12 text-base"
                />
              </div>
              <Button className="h-12 px-6 bg-primary-500 hover:bg-primary-600 text-white">
                <Icon name="Search" size={20} />
              </Button>
            </div>
          </div>
          
          <Button className="mt-6 bg-primary-600 hover:bg-primary-700 text-white px-8" size="lg">
            {t.postProject}
          </Button>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
            <TabsTrigger value="projects" className="flex items-center gap-2">
              <Icon name="FolderOpen" size={16} />
              {t.featuredProjects}
            </TabsTrigger>
            <TabsTrigger value="freelancers" className="flex items-center gap-2">
              <Icon name="Users" size={16} />
              {t.topFreelancers}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="projects" className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-semibold text-primary-500">{t.featuredProjects}</h3>
              <Select defaultValue="all">
                <SelectTrigger className="w-48">
                  <SelectValue placeholder={t.allCategories} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.allCategories}</SelectItem>
                  <SelectItem value="web">Веб-разработка</SelectItem>
                  <SelectItem value="design">Дизайн</SelectItem>
                  <SelectItem value="marketing">Маркетинг</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {sampleProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="freelancers" className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-semibold text-primary-500">{t.topFreelancers}</h3>
              <Select defaultValue="rating">
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rating">По рейтингу</SelectItem>
                  <SelectItem value="price">По цене</SelectItem>
                  <SelectItem value="projects">По проектам</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {sampleFreelancers.map((freelancer) => (
                <FreelancerCard key={freelancer.id} freelancer={freelancer} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="bg-primary-500 text-white py-12 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h4 className="font-semibold mb-4">{t.title}</h4>
              <p className="text-primary-100 text-sm">
                Современная биржа фриланса для профессионалов со всего мира
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Для заказчиков</h4>
              <ul className="space-y-2 text-sm text-primary-100">
                <li>Разместить проект</li>
                <li>Найти исполнителя</li>
                <li>Управление проектами</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Для исполнителей</h4>
              <ul className="space-y-2 text-sm text-primary-100">
                <li>Найти проекты</li>
                <li>Создать профиль</li>
                <li>Повысить рейтинг</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Поддержка</h4>
              <ul className="space-y-2 text-sm text-primary-100">
                <li>Центр помощи</li>
                <li>Связаться с нами</li>
                <li>Сообщество</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-primary-400 mt-8 pt-8 text-center text-primary-100 text-sm">
            © 2024 FreelanceHub. Все права защищены.
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={handleAuthSuccess}
        initialMode={authMode}
      />
    </div>
  );
}

export default Index;