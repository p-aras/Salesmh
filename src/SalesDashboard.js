import React, { useMemo, useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { createGlobalStyle, keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';

// Lazy load icons
const FiFileText = lazy(() => import('react-icons/fi').then(mod => ({ default: mod.FiFileText })));
const FiList = lazy(() => import('react-icons/fi').then(mod => ({ default: mod.FiList })));
const FiArrowRight = lazy(() => import('react-icons/fi').then(mod => ({ default: mod.FiArrowRight })));
const FiTrendingUp = lazy(() => import('react-icons/fi').then(mod => ({ default: mod.FiTrendingUp })));
const FiUsers = lazy(() => import('react-icons/fi').then(mod => ({ default: mod.FiUsers })));
const FiSettings = lazy(() => import('react-icons/fi').then(mod => ({ default: mod.FiSettings })));
const FiClipboard = lazy(() => import('react-icons/fi').then(mod => ({ default: mod.FiClipboard })));
const FiPrinter = lazy(() => import('react-icons/fi').then(mod => ({ default: mod.FiPrinter })));
const FiScissors = lazy(() => import('react-icons/fi').then(mod => ({ default: mod.FiScissors })));
const FiStar = lazy(() => import('react-icons/fi').then(mod => ({ default: mod.FiStar })));
const FiX = lazy(() => import('react-icons/fi').then(mod => ({ default: mod.FiX })));
const FiShoppingCart = lazy(() => import('react-icons/fi').then(mod => ({ default: mod.FiShoppingCart })));
const FiLayers = lazy(() => import('react-icons/fi').then(mod => ({ default: mod.FiLayers })));
const FiBox = lazy(() => import('react-icons/fi').then(mod => ({ default: mod.FiBox })));
const FiPackage = lazy(() => import('react-icons/fi').then(mod => ({ default: mod.FiPackage })));
const FiTag = lazy(() => import('react-icons/fi').then(mod => ({ default: mod.FiTag })));
const FiGrid = lazy(() => import('react-icons/fi').then(mod => ({ default: mod.FiGrid })));
const FiClock = lazy(() => import('react-icons/fi').then(mod => ({ default: mod.FiClock })));
const FiMenu = lazy(() => import('react-icons/fi').then(mod => ({ default: mod.FiMenu })));
const FiHome = lazy(() => import('react-icons/fi').then(mod => ({ default: mod.FiHome })));
const FiBarChart2 = lazy(() => import('react-icons/fi').then(mod => ({ default: mod.FiBarChart2 })));
const FiBell = lazy(() => import('react-icons/fi').then(mod => ({ default: mod.FiBell })));
const FiSearch = lazy(() => import('react-icons/fi').then(mod => ({ default: mod.FiSearch })));
const FiMoreVertical = lazy(() => import('react-icons/fi').then(mod => ({ default: mod.FiMoreVertical })));
const FiActivity = lazy(() => import('react-icons/fi').then(mod => ({ default: mod.FiActivity })));
const FiCheckCircle = lazy(() => import('react-icons/fi').then(mod => ({ default: mod.FiCheckCircle })));
const FiAlertCircle = lazy(() => import('react-icons/fi').then(mod => ({ default: mod.FiAlertCircle })));

// Elegant Navy & White Theme
const THEME = {
  navy: {
    darkest: '#0a1128',
    dark: '#0f1a3a',
    medium: '#162447',
    light: '#1e2a5a',
    muted: '#2a3a7a',
  },
  white: '#ffffff',
  offWhite: '#ffffff',
  gray: {
    50: '#f9fafb',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#002a6d',
    900: '#0f172a',
  },
  accent: {
    blue: '#3b82f6',
    cyan: '#06b6d4',
    emerald: '#10b981',
    amber: '#f59e0b',
    rose: '#ef4444',
    violet: '#8b5cf6',
  },
  gradient: {
    primary: 'linear-gradient(135deg, #0f1a3a 0%, #162447 100%)',
    secondary: 'linear-gradient(135deg, #1e2a5a 0%, #2a3a7a 100%)',
    glow: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
  },
  shadow: {
    sm: '0 2px 4px rgba(0, 0, 0, 0.02), 0 1px 2px rgba(0, 0, 0, 0.03)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.02)',
    glow: '0 8px 30px rgba(59, 130, 246, 0.15)',
  },
};

// Animations
const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideUp = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const scaleIn = keyframes`
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-4px); }
`;

// Card Data
const CARDS = [
  { id: 1, icon: 'FiFileText', title: 'Sales Order Form', description: 'Create and manage customer sales orders', path: '/sales-order', category: 'Orders', priority: 'high', stats: '24 today', trend: '+12%' },
  { id: 2, icon: 'FiList', title: 'Order Tracking', description: 'Monitor production status in real-time', path: '/sales-data', category: 'Orders', priority: 'medium', stats: '12 pending', trend: '+5%' },
  { id: 3, icon: 'FiGrid', title: 'All Orders', description: 'Complete order management system', path: '/all-order-details', category: 'Orders', priority: 'low', stats: '156 total', trend: '-3%' },
  { id: 4, icon: 'FiSettings', title: 'Sample Design', description: 'Submit and track design samples', path: '/sample-design-form', category: 'Design', priority: 'high', stats: '8 new', trend: '+25%' },
  { id: 6, icon: 'FiUsers', title: 'Issued Lot No.', description: 'Fabric issue resolution with tracking', path: '/pending-fabric-issues', category: 'Fabric', priority: 'critical', stats: '3 urgent', trend: '+40%' },
  { id: 7, icon: 'FiClipboard', title: 'Cutting Job Order', description: 'Create cutting job orders with precision', path: '/job-order-form', category: 'Cutting', priority: 'high', stats: '5 today', trend: '+8%' },
  { id: 8, icon: 'FiList', title: 'All Cutting Jobs', description: 'Manage all cutting orders efficiently', path: '/all-job-orders', category: 'Cutting', priority: 'medium', stats: '42 active', trend: '+2%' },
  { id: 9, icon: 'FiScissors', title: 'Embroidery Challan', description: 'Embroidery order management', path: '/embroidery-challan', category: 'Embroidery', priority: 'medium', stats: '15 pending', trend: '-5%' },
  { id: 10, icon: 'FiPrinter', title: 'Printing Challan', description: 'Printing order tracking', path: '/printing-challan', category: 'Printing', priority: 'high', stats: '8 today', trend: '+18%' },
  { id: 11, icon: 'FiScissors', title: 'Cutting Details', description: 'Cutting budget calculator', path: '/cutting-budget', category: 'Cutting', priority: 'low', stats: '3 entries', trend: '0%' },
  { id: 12, icon: 'FiPackage', title: 'Cutting Records', description: 'Historical cutting data', path: '/details', category: 'Cutting', priority: 'low', stats: '28 records', trend: '+15%' },
  { id: 13, icon: 'FiBox', title: 'Embroidery Pending', description: 'Pending embroidery challans', path: '/emb-pending-challan', category: 'Embroidery', priority: 'critical', stats: '7 pending', trend: '+30%' },
  { id: 14, icon: 'FiPrinter', title: 'Printing Pending', description: 'Pending printing challans', path: '/printing-pending-challan', category: 'Printing', priority: 'high', stats: '4 pending', trend: '+22%' },
  { id: 15, icon: 'FiTag', title: 'SOP Documents', description: 'Standard operating procedures', path: '/sop', category: 'Documents', priority: 'low', stats: 'Updated', trend: 'New' },
  { id: 16, icon: 'FiX', title: 'Cancel Order', description: 'Order cancellation workflow', path: '/cancel-order', category: 'Orders', priority: 'medium', stats: '2 today', trend: '-8%' },
  { id: 17, icon: 'FiClipboard', title: 'Material Requisition', description: 'Material planning form', path: '/material-requisition-form', category: 'Planning', priority: 'high', stats: '4 new', trend: '+35%' },
  { id: 18, icon: 'FiTrendingUp', title: 'Requisition Dashboard', description: 'Material analytics dashboard', path: '/material-requisition-dashboard', category: 'Planning', priority: 'medium', stats: 'Live', trend: '+28%' },
  { id: 19, icon: 'FiUsers', title: 'Parta Details', description: 'Parta information management', path: '/parta-details', category: 'Production', priority: 'medium', stats: '6 entries', trend: '+4%' },
  { id: 20, icon: 'FiPackage', title: 'Packing Report', description: 'Update packing reports', path: '/packing-report', category: 'Logistics', priority: 'high', stats: '9 pending', trend: '+16%' },
];

// Category config
const CATEGORIES = [
  { id: 'all', label: 'Overview', icon: 'FiGrid', color: '#3b82f6' },
  { id: 'Orders', label: 'Orders', icon: 'FiShoppingCart', color: '#3b82f6' },
  { id: 'Cutting', label: 'Cutting', icon: 'FiScissors', color: '#06b6d4' },
  { id: 'Embroidery', label: 'Embroidery', icon: 'FiBox', color: '#8b5cf6' },
  { id: 'Printing', label: 'Printing', icon: 'FiPrinter', color: '#f59e0b' },
  { id: 'Planning', label: 'Planning', icon: 'FiTrendingUp', color: '#10b981' },
  { id: 'Design', label: 'Design', icon: 'FiSettings', color: '#ec4899' },
  { id: 'Fabric', label: 'Fabric', icon: 'FiUsers', color: '#ef4444' },
  { id: 'Documents', label: 'Documents', icon: 'FiFileText', color: '#64748b' },
  { id: 'Logistics', label: 'Logistics', icon: 'FiPackage', color: '#3b82f6' },
  { id: 'Production', label: 'Production', icon: 'FiActivity', color: '#8b5cf6' },
];

const iconComponents = {
  FiFileText, FiList, FiArrowRight, FiTrendingUp, FiUsers, FiSettings, FiClipboard,
  FiPrinter, FiScissors, FiStar, FiX, FiShoppingCart, FiLayers, FiBox, FiPackage,
  FiTag, FiGrid, FiClock, FiMenu, FiHome, FiBarChart2, FiBell, FiSearch, FiMoreVertical,
  FiActivity, FiCheckCircle, FiAlertCircle,
};

const CANCEL_ROUTES = {
  sale: '/cancel-order/sales',
  job: '/cancel-order/job',
};

// Global Styles
const GlobalStyle = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: 'Inter', 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif;
    background: ${THEME.offWhite};
    color: ${THEME.gray[800]};
    overflow-x: hidden;
  }

  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  ::-webkit-scrollbar-track {
    background: ${THEME.gray[200]};
    border-radius: 10px;
  }

  ::-webkit-scrollbar-thumb {
    background: ${THEME.gray[400]};
    border-radius: 10px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: ${THEME.navy.medium};
  }
`;

const SalesDashboard = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCancelPicker, setShowCancelPicker] = useState(false);
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('favoriteModulesModern');
    return saved ? JSON.parse(saved) : [1, 4, 7];
  });

  useEffect(() => {
    localStorage.setItem('favoriteModulesModern', JSON.stringify(favorites));
  }, [favorites]);

  const filteredCards = useMemo(() => {
    let filtered = CARDS;
    if (activeCategory !== 'all') {
      filtered = filtered.filter(card => card.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(card => 
        card.title.toLowerCase().includes(query) || 
        card.description.toLowerCase().includes(query)
      );
    }
    return filtered;
  }, [activeCategory, searchQuery]);

  const handleCardClick = useCallback((card) => {
    if (card.id === 16) {
      setShowCancelPicker(true);
      return;
    }
    navigate(card.path);
  }, [navigate]);

  const handlePick = useCallback((type) => {
    setShowCancelPicker(false);
    navigate(CANCEL_ROUTES[type]);
  }, [navigate]);

  const toggleFavorite = useCallback((cardId, e) => {
    e.stopPropagation();
    setFavorites(prev => 
      prev.includes(cardId) ? prev.filter(id => id !== cardId) : [...prev, cardId]
    );
  }, []);

  const renderIcon = (iconName, props = {}) => {
    const IconComponent = iconComponents[iconName];
    return IconComponent ? <IconComponent {...props} /> : null;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      critical: THEME.accent.rose,
      high: THEME.accent.amber,
      medium: THEME.accent.blue,
      low: THEME.accent.emerald,
    };
    return colors[priority] || THEME.gray[500];
  };

  return (
    <>
      <GlobalStyle />
      <DashboardContainer>
        {/* Elegant Sidebar */}
        <Sidebar>
          <SidebarHeader>
            <Logo>
              <LogoIcon>
                <span>M</span>
                <span>H</span>
              </LogoIcon>
              <LogoText>Manufacturing<span>Hub</span></LogoText>
            </Logo>
          </SidebarHeader>

          <SidebarNav>
            {CATEGORIES.map((category) => (
              <NavItem
                key={category.id}
                $active={activeCategory === category.id}
                onClick={() => setActiveCategory(category.id)}
              >
                <NavIcon $active={activeCategory === category.id} $color={category.color}>
                  {renderIcon(category.icon, { size: 20 })}
                </NavIcon>
                <NavLabel>{category.label}</NavLabel>
                {activeCategory === category.id && <ActiveIndicator />}
              </NavItem>
            ))}
          </SidebarNav>

          <SidebarFooter>
            <UserAvatar>
              <span>PM</span>
            </UserAvatar>
            <UserInfo>
              <UserName>Production Manager</UserName>
              <UserRole>Manufacturing Hub</UserRole>
            </UserInfo>
          </SidebarFooter>
        </Sidebar>

        {/* Main Content */}
        <MainContent>
          {/* Elegant Top Bar */}
          <TopBar>
            <WelcomeSection>
              <GreetingIcon>✨</GreetingIcon>
              <GreetingText>
                Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : ' Evening'},
                <span> Production Manager</span>
              </GreetingText>
            </WelcomeSection>

            <ActionGroup>
              <SearchBar>
                {renderIcon('FiSearch', { size: 18 })}
                <SearchInput 
                  type="text" 
                  placeholder="Search modules..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </SearchBar>
              
              <NotificationBtn>
                {renderIcon('FiBell', { size: 20 })}
                <NotificationBadge>3</NotificationBadge>
              </NotificationBtn>
            </ActionGroup>
          </TopBar>

          {/* Hero Stats Section */}
          <HeroSection>
            <HeroTitle>
              <h1>Production Dashboard</h1>
              <p>Monitor and manage all manufacturing operations from a single view</p>
            </HeroTitle>
            
            <StatsGrid>
              <StatCard $gradient>
                <StatIcon>
                  {renderIcon('FiGrid', { size: 24 })}
                </StatIcon>
                <StatInfo>
                  <StatValue>{filteredCards.length}</StatValue>
                  <StatLabel>Active Modules</StatLabel>
                </StatInfo>
              </StatCard>
              
              <StatCard>
                <StatIcon style={{ background: THEME.navy.light }}>
                  {renderIcon('FiStar', { size: 24 })}
                </StatIcon>
                <StatInfo>
                  <StatValue>{favorites.length}</StatValue>
                  <StatLabel>Favorites</StatLabel>
                </StatInfo>
              </StatCard>
              
              <StatCard>
                <StatIcon style={{ background: THEME.navy.light }}>
                  {renderIcon('FiClock', { size: 24 })}
                </StatIcon>
                <StatInfo>
                  <StatValue>{filteredCards.filter(c => c.priority === 'critical' || c.priority === 'high').length}</StatValue>
                  <StatLabel>High Priority</StatLabel>
                </StatInfo>
              </StatCard>
              
              <StatCard>
                <StatIcon style={{ background: THEME.navy.light }}>
                  {renderIcon('FiTrendingUp', { size: 24 })}
                </StatIcon>
                <StatInfo>
                  <StatValue>98%</StatValue>
                  <StatLabel>Efficiency Rate</StatLabel>
                </StatInfo>
              </StatCard>
            </StatsGrid>
          </HeroSection>

          {/* Modules Section */}
          <ModulesSection>
            <SectionHeader>
              <SectionTitle>
                {activeCategory === 'all' ? 'All Modules' : activeCategory}
                <ModuleCount>{filteredCards.length}</ModuleCount>
              </SectionTitle>
              <ViewAllBtn>
                View All
                {renderIcon('FiArrowRight', { size: 16 })}
              </ViewAllBtn>
            </SectionHeader>

            <Suspense fallback={<LoadingGrid />}>
              <ModulesGrid>
                <AnimatePresence mode="wait">
                  {[...filteredCards]
                    .sort((a, b) => {
                      const aFav = favorites.includes(a.id);
                      const bFav = favorites.includes(b.id);
                      if (aFav && !bFav) return -1;
                      if (!aFav && bFav) return 1;
                      return 0;
                    })
                    .map((card) => (
                      <ModuleCard
                        key={card.id}
                        onClick={() => handleCardClick(card)}
                        whileHover={{ y: -4 }}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                      >
                        <CardGradient $priority={card.priority} />
                        <CardHeader>
                          <CardIcon $priority={card.priority}>
                            {renderIcon(card.icon, { size: 22 })}
                          </CardIcon>
                          <FavoriteBtn 
                            $isFavorite={favorites.includes(card.id)} 
                            onClick={(e) => toggleFavorite(card.id, e)}
                            whileTap={{ scale: 0.9 }}
                          >
                            {renderIcon('FiStar', { size: 16, fill: favorites.includes(card.id) ? THEME.accent.amber : 'none', stroke: favorites.includes(card.id) ? THEME.accent.amber : THEME.gray[400] })}
                          </FavoriteBtn>
                        </CardHeader>
                        <CardTitle>{card.title}</CardTitle>
                        <CardDescription>{card.description}</CardDescription>
                        <CardFooter>
                          <PriorityBadge $color={getPriorityColor(card.priority)}>
                            <BadgeDot $color={getPriorityColor(card.priority)} />
                            {card.priority}
                          </PriorityBadge>
                          <StatBadge>
                            {renderIcon('FiClock', { size: 12 })}
                            <span>{card.stats}</span>
                          </StatBadge>
                        </CardFooter>
                      </ModuleCard>
                    ))}
                </AnimatePresence>
              </ModulesGrid>
            </Suspense>

            {filteredCards.length === 0 && (
              <EmptyState>
                <EmptyIcon>🔍</EmptyIcon>
                <EmptyTitle>No modules found</EmptyTitle>
                <EmptyDesc>Try adjusting your search or category filter</EmptyDesc>
              </EmptyState>
            )}
          </ModulesSection>
        </MainContent>

        {/* Cancel Modal */}
        <AnimatePresence>
          {showCancelPicker && (
            <ModalOverlay
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCancelPicker(false)}
            >
              <ModalContent
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                onClick={(e) => e.stopPropagation()}
              >
                <ModalHeader>
                  <ModalTitle>Cancel Order</ModalTitle>
                  <CloseBtn onClick={() => setShowCancelPicker(false)}>
                    {renderIcon('FiX', { size: 20 })}
                  </CloseBtn>
                </ModalHeader>
                <ModalBody>
                  <ModalDesc>Select the type of order you want to cancel</ModalDesc>
                  <OptionGrid>
                    <OptionItem onClick={() => handlePick('sale')}>
                      <OptionIcon $color={THEME.accent.blue}>
                        {renderIcon('FiShoppingCart', { size: 22 })}
                      </OptionIcon>
                      <OptionInfo>
                        <OptionName>Sales Order</OptionName>
                        <OptionDesc>Cancel customer-facing sales orders</OptionDesc>
                      </OptionInfo>
                      {renderIcon('FiArrowRight', { size: 16 })}
                    </OptionItem>
                    <OptionItem onClick={() => handlePick('job')}>
                      <OptionIcon $color={THEME.accent.cyan}>
                        {renderIcon('FiLayers', { size: 22 })}
                      </OptionIcon>
                      <OptionInfo>
                        <OptionName>Job Order</OptionName>
                        <OptionDesc>Cancel internal production job orders</OptionDesc>
                      </OptionInfo>
                      {renderIcon('FiArrowRight', { size: 16 })}
                    </OptionItem>
                  </OptionGrid>
                </ModalBody>
              </ModalContent>
            </ModalOverlay>
          )}
        </AnimatePresence>
      </DashboardContainer>
    </>
  );
};

// Loading Components
const LoadingGrid = () => (
  <ModulesGrid>
    {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
  </ModulesGrid>
);

const SkeletonCard = styled.div`
  background: ${THEME.white};
  border-radius: 24px;
  padding: 1.5rem;
  animation: ${shimmer} 1.5s infinite;
  background: linear-gradient(90deg, ${THEME.gray[100]} 25%, ${THEME.gray[200]} 50%, ${THEME.gray[100]} 75%);
  background-size: 200% 100%;
  height: 200px;
`;

// ========== STYLED COMPONENTS ==========

const DashboardContainer = styled.div`
  display: flex;
  min-height: 100vh;
  background: ${THEME.offWhite};
`;

const Sidebar = styled.aside`
  width: 280px;
  background: ${THEME.navy.dark};
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  z-index: 100;
  
  &::-webkit-scrollbar {
    width: 4px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${THEME.navy.medium};
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${THEME.navy.light};
  }
`;

const SidebarHeader = styled.div`
  padding: 2rem 1.5rem;
  border-bottom: 1px solid ${THEME.navy.light};
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const LogoIcon = styled.div`
  display: flex;
  gap: 0.1rem;
  
  span {
    width: 28px;
    height: 28px;
    background: ${THEME.gradient.glow};
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${THEME.white};
    font-weight: 800;
    font-size: 1rem;
    
    &:first-child {
      border-top-right-radius: 4px;
      border-bottom-right-radius: 4px;
    }
    
    &:last-child {
      border-top-left-radius: 4px;
      border-bottom-left-radius: 4px;
      background: ${THEME.navy.light};
    }
  }
`;

const LogoText = styled.h1`
  font-size: 1.2rem;
  font-weight: 700;
  color: ${THEME.white};
  
  span {
    font-weight: 400;
    color: ${THEME.accent.blue};
  }
`;

const SidebarNav = styled.nav`
  flex: 1;
  padding: 1.5rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const NavItem = styled.button`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.85rem 1rem;
  width: 100%;
  background: ${props => props.$active ? THEME.navy.light : 'transparent'};
  border: none;
  border-radius: 14px;
  cursor: pointer;
  color: ${props => props.$active ? THEME.white : THEME.gray[400]};
  position: relative;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${THEME.navy.light};
    color: ${THEME.white};
  }
`;

const NavIcon = styled.span`
  display: flex;
  align-items: center;
  color: ${props => props.$active ? props.$color : 'currentColor'};
`;

const NavLabel = styled.span`
  flex: 1;
  text-align: left;
  font-weight: 500;
  font-size: 0.9rem;
`;

const ActiveIndicator = styled.div`
  position: absolute;
  right: 0;
  width: 3px;
  height: 20px;
  background: ${THEME.accent.blue};
  border-radius: 3px;
`;

const SidebarFooter = styled.div`
  padding: 1.5rem;
  border-top: 1px solid ${THEME.navy.light};
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const UserAvatar = styled.div`
  width: 40px;
  height: 40px;
  background: ${THEME.navy.light};
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  span {
    font-weight: 700;
    font-size: 0.9rem;
    color: ${THEME.white};
  }
`;

const UserInfo = styled.div`
  flex: 1;
`;

const UserName = styled.div`
  font-size: 0.85rem;
  font-weight: 600;
  color: ${THEME.white};
`;

const UserRole = styled.div`
  font-size: 0.7rem;
  color: ${THEME.gray[400]};
`;

const MainContent = styled.main`
  flex: 1;
  padding: 1.5rem 2.5rem;
  overflow-x: hidden;
  
  @media (max-width: 768px) {
    padding: 1rem 1.5rem;
  }
`;

const TopBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
`;

const WelcomeSection = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const GreetingIcon = styled.span`
  font-size: 1.5rem;
`;

const GreetingText = styled.span`
  font-size: 0.9rem;
  color: ${THEME.gray[600]};
  
  span {
    font-weight: 600;
    color: ${THEME.navy.dark};
  }
`;

const ActionGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const SearchBar = styled.div`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  background: ${THEME.white};
  padding: 0.6rem 1.2rem;
  border-radius: 40px;
  border: 1px solid ${THEME.gray[200]};
  color: ${THEME.gray[400]};
  transition: all 0.2s;
  
  &:focus-within {
    border-color: ${THEME.accent.blue};
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const SearchInput = styled.input`
  border: none;
  outline: none;
  background: transparent;
  font-size: 0.9rem;
  width: 220px;
  
  &::placeholder {
    color: ${THEME.gray[400]};
  }
`;

const NotificationBtn = styled.button`
  position: relative;
  background: ${THEME.white};
  border: 1px solid ${THEME.gray[200]};
  padding: 0.6rem;
  border-radius: 40px;
  cursor: pointer;
  display: flex;
  align-items: center;
  color: ${THEME.gray[600]};
  transition: all 0.2s;
  
  &:hover {
    background: ${THEME.gray[100]};
  }
`;

const NotificationBadge = styled.span`
  position: absolute;
  top: -2px;
  right: -2px;
  background: ${THEME.accent.rose};
  color: ${THEME.white};
  font-size: 0.6rem;
  padding: 0.1rem 0.35rem;
  border-radius: 20px;
  font-weight: 700;
`;

const HeroSection = styled.div`
  margin-bottom: 2.5rem;
`;

const HeroTitle = styled.div`
  margin-bottom: 2rem;
  
  h1 {
    font-size: 2rem;
    font-weight: 700;
    color: ${THEME.navy.dark};
    margin-bottom: 0.5rem;
  }
  
  p {
    color: ${THEME.gray[600]};
    font-size: 0.9rem;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.25rem;
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const StatCard = styled.div`
  background: ${THEME.white};
  padding: 1.25rem;
  border-radius: 24px;
  display: flex;
  align-items: center;
  gap: 1rem;
  border: 1px solid ${THEME.gray[200]};
  transition: all 0.2s;
  
  ${props => props.$gradient && `
    background: ${THEME.gradient.primary};
    border: none;
    
    ${StatValue}, ${StatLabel} {
      color: ${THEME.white};
    }
  `}
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${THEME.shadow.lg};
  }
`;

const StatIcon = styled.div`
  width: 52px;
  height: 52px;
  background: ${THEME.navy.dark};
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${THEME.white};
`;

const StatInfo = styled.div`
  display: flex;
  flex-direction: column;
`;

const StatValue = styled.div`
  font-size: 1.75rem;
  font-weight: 800;
  color: ${THEME.navy.dark};
`;

const StatLabel = styled.div`
  font-size: 0.8rem;
  font-weight: 500;
  color: ${THEME.gray[500]};
`;

const ModulesSection = styled.div``;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const SectionTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${THEME.navy.dark};
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const ModuleCount = styled.span`
  background: ${THEME.gray[200]};
  padding: 0.2rem 0.6rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  color: ${THEME.gray[700]};
`;

const ViewAllBtn = styled.button`
  background: none;
  border: none;
  font-size: 0.85rem;
  font-weight: 500;
  color: ${THEME.accent.blue};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
  
  &:hover {
    gap: 0.75rem;
  }
`;

const ModulesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
`;

const ModuleCard = styled(motion.div)`
  background: ${THEME.white};
  border-radius: 24px;
  padding: 1.5rem;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
  border: 1px solid ${THEME.gray[200]};
  
  &:hover {
    box-shadow: ${THEME.shadow.xl};
    border-color: transparent;
  }
`;

const CardGradient = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: ${props => getPriorityColor(props.$priority)};
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
`;

const CardIcon = styled.div`
  width: 48px;
  height: 48px;
  background: ${props => `${getPriorityColor(props.$priority)}15`};
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => getPriorityColor(props.$priority)};
`;

const FavoriteBtn = styled(motion.button)`
  background: none;
  border: none;
  cursor: pointer;
  color: ${props => props.$isFavorite ? THEME.accent.amber : THEME.gray[400]};
  padding: 0.25rem;
  border-radius: 8px;
  
  &:hover {
    color: ${THEME.accent.amber};
  }
`;

const CardTitle = styled.h4`
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  color: ${THEME.navy.dark};
`;

const CardDescription = styled.p`
  font-size: 0.85rem;
  color: ${THEME.gray[600]};
  margin-bottom: 1rem;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const CardFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const PriorityBadge = styled.span`
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.3rem 0.8rem;
  border-radius: 20px;
  background: ${props => `${props.$color}10`};
  color: ${props => props.$color};
  text-transform: capitalize;
  display: flex;
  align-items: center;
  gap: 0.35rem;
`;

const BadgeDot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${props => props.$color};
`;

const StatBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.7rem;
  font-weight: 500;
  color: ${THEME.gray[500]};
  
  span {
    font-weight: 600;
    color: ${THEME.gray[700]};
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem;
  background: ${THEME.white};
  border-radius: 28px;
  border: 1px solid ${THEME.gray[200]};
`;

const EmptyIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.6;
`;

const EmptyTitle = styled.h4`
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  color: ${THEME.navy.dark};
`;

const EmptyDesc = styled.p`
  color: ${THEME.gray[500]};
  font-size: 0.85rem;
`;

const ModalOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(10, 17, 40, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
`;

const ModalContent = styled(motion.div)`
  background: ${THEME.white};
  border-radius: 28px;
  max-width: 440px;
  width: 100%;
  overflow: hidden;
  box-shadow: ${THEME.shadow.xl};
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid ${THEME.gray[200]};
`;

const ModalTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${THEME.navy.dark};
`;

const CloseBtn = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: ${THEME.gray[400]};
  padding: 0.35rem;
  border-radius: 8px;
  
  &:hover {
    background: ${THEME.gray[100]};
  }
`;

const ModalBody = styled.div`
  padding: 1.5rem;
`;

const ModalDesc = styled.p`
  color: ${THEME.gray[600]};
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
`;

const OptionGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const OptionItem = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid ${THEME.gray[200]};
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    border-color: ${THEME.accent.blue};
    background: ${THEME.gray[50]};
  }
`;

const OptionIcon = styled.div`
  width: 48px;
  height: 48px;
  background: ${props => `${props.$color}10`};
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => props.$color};
`;

const OptionInfo = styled.div`
  flex: 1;
`;

const OptionName = styled.div`
  font-weight: 700;
  font-size: 0.95rem;
  margin-bottom: 0.25rem;
  color: ${THEME.navy.dark};
`;

const OptionDesc = styled.div`
  font-size: 0.75rem;
  color: ${THEME.gray[500]};
`;

function getPriorityColor(priority) {
  const colors = {
    critical: '#ef4444',
    high: '#f59e0b',
    medium: '#3b82f6',
    low: '#10b981',
  };
  return colors[priority] || '#64748b';
}

export default React.memo(SalesDashboard);