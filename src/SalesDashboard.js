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

// Blue & White Professional Theme - direct values, no :root colors
const THEME = {
  primary: '#2563eb',
  primaryDark: '#1d4ed8',
  primaryLight: '#3b82f6',
  primarySoft: '#eff6ff',
  secondary: '#0284c7',
  secondaryLight: '#38bdf8',
  tertiary: '#0ea5e9',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#06b6d4',
  white: '#ffffff',
  background: '#f8fafc',
  cardBg: '#ffffff',
  sidebarBg: '#ffffff',
  textPrimary: '#0f172a',
  textSecondary: '#1e293b',
  textLight: '#334155',
  textMuted: '#475569',
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  shadowSm: '0 1px 2px rgba(0, 0, 0, 0.03), 0 1px 2px rgba(0, 0, 0, 0.05)',
  shadowMd: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
  shadowLg: '0 10px 15px -3px rgba(0, 0, 0, 0.07), 0 4px 6px -2px rgba(0, 0, 0, 0.03)',
  shadowXl: '0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 10px 10px -5px rgba(0, 0, 0, 0.02)',
  shadowBlue: '0 4px 12px rgba(37, 99, 235, 0.12)',
  shadowBlueHover: '0 8px 24px rgba(37, 99, 235, 0.18)',
  gradientPrimary: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
  gradientLight: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
  gradientCard: 'linear-gradient(135deg, #ffffff 0%, #ffffff 100%)',
  gradientBlueMist: 'linear-gradient(135deg, #e0f2fe 0%, #bfdbfe 100%)',
};

// Animations
const slideIn = keyframes`
  from { transform: translateX(-100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
`;

const fadeScale = keyframes`
  from { opacity: 0; transform: scale(0.96) translateY(10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(0.98); }
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

// Card data
const CARDS = [
  { id: 1, icon: 'FiFileText', title: 'Sales Order Form', description: 'Create and manage customer sales orders with real-time tracking', path: '/sales-order', category: 'Orders', priority: 'high', stats: '24 today', badge: 'urgent', trend: '+12%', color: 'primary' },
  { id: 2, icon: 'FiList', title: 'Order Tracking', description: 'Monitor production status in real-time with analytics', path: '/sales-data', category: 'Orders', priority: 'medium', stats: '12 pending', badge: 'in-progress', trend: '+5%', color: 'secondary' },
  { id: 3, icon: 'FiGrid', title: 'All Orders', description: 'Complete order management system with insights', path: '/all-order-details', category: 'Orders', priority: 'low', stats: '156 total', badge: 'archived', trend: '-3%', color: 'primary' },
  { id: 4, icon: 'FiSettings', title: 'Sample Design', description: 'Submit and track design samples with feedback', path: '/sample-design-form', category: 'Design', priority: 'high', stats: '8 new', badge: 'review', trend: '+25%', color: 'secondary' },
  { id: 6, icon: 'FiUsers', title: 'Issued Lot No.', description: 'Fabric issue resolution with batch tracking', path: '/pending-fabric-issues', category: 'Fabric', priority: 'critical', stats: '3 urgent', badge: 'critical', trend: '+40%', color: 'danger' },
  { id: 7, icon: 'FiClipboard', title: 'Cutting Job Order', description: 'Create cutting job orders with precision', path: '/job-order-form', category: 'Cutting', priority: 'high', stats: '5 today', badge: 'active', trend: '+8%', color: 'primary' },
  { id: 8, icon: 'FiList', title: 'All Cutting Jobs', description: 'Manage all cutting orders efficiently', path: '/all-job-orders', category: 'Cutting', priority: 'medium', stats: '42 active', badge: 'ongoing', trend: '+2%', color: 'secondary' },
  { id: 9, icon: 'FiScissors', title: 'Embroidery Challan', description: 'Embroidery order management with quality check', path: '/embroidery-challan', category: 'Embroidery', priority: 'medium', stats: '15 pending', badge: 'waiting', trend: '-5%', color: 'primary' },
  { id: 10, icon: 'FiPrinter', title: 'Printing Challan', description: 'Printing order tracking with color management', path: '/printing-challan', category: 'Printing', priority: 'high', stats: '8 today', badge: 'new', trend: '+18%', color: 'secondary' },
  { id: 11, icon: 'FiScissors', title: 'Cutting Details', description: 'Cutting budget calculator with analytics', path: '/cutting-budget', category: 'Cutting', priority: 'low', stats: '3 entries', badge: 'draft', trend: '0%', color: 'primary' },
  { id: 12, icon: 'FiPackage', title: 'Cutting Records', description: 'Historical cutting data with patterns', path: '/details', category: 'Cutting', priority: 'low', stats: '28 records', badge: 'completed', trend: '+15%', color: 'success' },
  { id: 13, icon: 'FiBox', title: 'Embroidery Pending', description: 'Pending embroidery challans with deadlines', path: '/emb-pending-challan', category: 'Embroidery', priority: 'critical', stats: '7 pending', badge: 'delayed', trend: '+30%', color: 'danger' },
  { id: 14, icon: 'FiPrinter', title: 'Printing Pending', description: 'Pending printing challans with status', path: '/printing-pending-challan', category: 'Printing', priority: 'high', stats: '4 pending', badge: 'urgent', trend: '+22%', color: 'warning' },
  { id: 15, icon: 'FiTag', title: 'SOP Documents', description: 'Standard operating procedures and guidelines', path: '/sop', category: 'Documents', priority: 'low', stats: 'Updated', badge: 'info', trend: 'New', color: 'secondary' },
  { id: 16, icon: 'FiX', title: 'Cancel Order', description: 'Order cancellation workflow with approvals', path: '/cancel-order', category: 'Orders', priority: 'medium', stats: '2 today', badge: 'warning', trend: '-8%', color: 'danger' },
  { id: 17, icon: 'FiClipboard', title: 'Material Requisition', description: 'Material planning form with inventory sync', path: '/material-requisition-form', category: 'Planning', priority: 'high', stats: '4 new', badge: 'pending', trend: '+35%', color: 'primary' },
  { id: 18, icon: 'FiTrendingUp', title: 'Requisition Dashboard', description: 'Material analytics dashboard with KPIs', path: '/material-requisition-dashboard', category: 'Planning', priority: 'medium', stats: 'Live', badge: 'active', trend: '+28%', color: 'success' },
  { id: 19, icon: 'FiUsers', title: 'Parta Details', description: 'Parta information management system', path: '/parta-details', category: 'Production', priority: 'medium', stats: '6 entries', badge: 'completed', trend: '+4%', color: 'primary' },
  { id: 20, icon: 'FiPackage', title: 'Packing Report', description: 'Update packing reports with quality control', path: '/packing-report', category: 'Logistics', priority: 'high', stats: '9 pending', badge: 'in-progress', trend: '+16%', color: 'secondary' },
];

// Sidebar items
const SIDEBAR_ITEMS = [
  { id: 'all', label: 'All Modules', icon: 'FiGrid', count: CARDS.length },
  { id: 'Orders', label: 'Orders', icon: 'FiShoppingCart', count: CARDS.filter(c => c.category === 'Orders').length },
  { id: 'Cutting', label: 'Cutting', icon: 'FiScissors', count: CARDS.filter(c => c.category === 'Cutting').length },
  { id: 'Embroidery', label: 'Embroidery', icon: 'FiBox', count: CARDS.filter(c => c.category === 'Embroidery').length },
  { id: 'Printing', label: 'Printing', icon: 'FiPrinter', count: CARDS.filter(c => c.category === 'Printing').length },
  { id: 'Planning', label: 'Planning', icon: 'FiTrendingUp', count: CARDS.filter(c => c.category === 'Planning').length },
  { id: 'Design', label: 'Design', icon: 'FiSettings', count: CARDS.filter(c => c.category === 'Design').length },
  { id: 'Fabric', label: 'Fabric', icon: 'FiUsers', count: CARDS.filter(c => c.category === 'Fabric').length },
  { id: 'Documents', label: 'Documents', icon: 'FiFileText', count: CARDS.filter(c => c.category === 'Documents').length },
  { id: 'Logistics', label: 'Logistics', icon: 'FiPackage', count: CARDS.filter(c => c.category === 'Logistics').length },
  { id: 'Production', label: 'Production', icon: 'FiSettings', count: CARDS.filter(c => c.category === 'Production').length },
];

const PRIORITY_COLORS = {
  critical: { bg: '#fef2f2', text: '#ef4444', border: '#fee2e2' },
  high: { bg: '#eff6ff', text: '#2563eb', border: '#dbeafe' },
  medium: { bg: '#fffbeb', text: '#f59e0b', border: '#fef3c7' },
  low: { bg: '#f0fdf4', text: '#10b981', border: '#dcfce7' },
};

const CARD_COLORS = {
  primary: { gradient: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', light: '#eff6ff' },
  secondary: { gradient: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', light: '#f0f9ff' },
  success: { gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', light: '#f0fdf4' },
  warning: { gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', light: '#fffbeb' },
  danger: { gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', light: '#fef2f2' },
};

const CANCEL_ROUTES = {
  sale: '/cancel-order/sales',
  job: '/cancel-order/job',
};

const iconComponents = {
  FiFileText, FiList, FiArrowRight, FiTrendingUp, FiUsers, FiSettings, FiClipboard,
  FiPrinter, FiScissors, FiStar, FiX, FiShoppingCart, FiLayers, FiBox, FiPackage,
  FiTag, FiGrid, FiClock, FiMenu, FiHome, FiBarChart2, FiBell, FiSearch, FiMoreVertical,
  FiActivity, FiCheckCircle, FiAlertCircle,
};

// Global Styles with darker text
const GlobalStyle = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Poppins', sans-serif;
    background: #f8fafc;
    color: #0f172a;
    overflow-x: hidden;
    font-size: 16px;
  }

  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  ::-webkit-scrollbar-track {
    background: #e2e8f0;
    border-radius: 10px;
  }

  ::-webkit-scrollbar-thumb {
    background: #94a3b8;
    border-radius: 10px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: #2563eb;
  }
`;

const SalesDashboard = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('all');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showCancelPicker, setShowCancelPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
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

  const getCardColor = (colorName) => {
    return CARD_COLORS[colorName] || CARD_COLORS.primary;
  };

  const kanbanGroups = useMemo(() => {
    const groups = { critical: [], high: [], medium: [], low: [] };
    filteredCards.forEach(card => {
      groups[card.priority].push({ ...card, isFavorite: favorites.includes(card.id) });
    });
    return groups;
  }, [filteredCards, favorites]);

  const renderCard = (card) => {
    const cardColor = getCardColor(card.color);
    return (
      <Card
        key={card.id}
        onClick={() => handleCardClick(card)}
        $priority={card.priority}
        whileHover={{ y: -4, transition: { duration: 0.2 } }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
      >
        <CardHeader>
          <IconWrapper $priority={card.priority}>
            {renderIcon(card.icon, { size: 24 })}
          </IconWrapper>
          <FavoriteBtn 
            $isFavorite={card.isFavorite} 
            onClick={(e) => toggleFavorite(card.id, e)}
            whileTap={{ scale: 0.9 }}
          >
            {renderIcon('FiStar', { size: 18, fill: card.isFavorite ? '#f59e0b' : 'none', stroke: card.isFavorite ? '#f59e0b' : '#94a3b8' })}
          </FavoriteBtn>
        </CardHeader>
        <CardTitle>{card.title}</CardTitle>
        <CardDesc>{card.description}</CardDesc>
        <CardFooter>
          <Badge $priority={card.priority}>
            <BadgeDot $priority={card.priority} />
            {card.badge || card.priority}
          </Badge>
          <Stats>
            {renderIcon('FiClock', { size: 14 })}
            <span>{card.stats}</span>
          </Stats>
        </CardFooter>
      </Card>
    );
  };

  return (
    <>
      <GlobalStyle />
      <DashboardContainer>
        {/* Sidebar */}
        <Sidebar $collapsed={sidebarCollapsed}>
          <SidebarHeader>
            <Logo $collapsed={sidebarCollapsed}>
              <LogoIcon>MH</LogoIcon>
              {!sidebarCollapsed && <LogoText>Manufacturing Hub</LogoText>}
            </Logo>
            <CollapseBtn onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
              {renderIcon('FiMenu', { size: 20 })}
            </CollapseBtn>
          </SidebarHeader>

          <SidebarNav>
            {SIDEBAR_ITEMS.map((item) => (
              <NavItem 
                key={item.id}
                $active={activeCategory === item.id}
                onClick={() => setActiveCategory(item.id)}
                $collapsed={sidebarCollapsed}
              >
                <NavIcon $active={activeCategory === item.id}>
                  {renderIcon(item.icon, { size: 20 })}
                </NavIcon>
                {!sidebarCollapsed && (
                  <>
                    <NavLabel>{item.label}</NavLabel>
                    <NavCount>{item.count}</NavCount>
                  </>
                )}
              </NavItem>
            ))}
          </SidebarNav>

          <SidebarFooter>
            {!sidebarCollapsed && (
              <FooterText>Production Suite v3.0</FooterText>
            )}
          </SidebarFooter>
        </Sidebar>

        {/* Main Content */}
        <MainContent>
          <TopBar>
            <WelcomeSection>
              <Greeting>
                <span>✨</span>
                Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : ' Evening'}
              </Greeting>
              <UserName>Production Manager</UserName>
            </WelcomeSection>

            <RightSection>
              <SearchBar>
                {renderIcon('FiSearch', { size: 18 })}
                <SearchInput 
                  type="text" 
                  placeholder="Search modules..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </SearchBar>
              
              <ViewToggle>
                <ViewBtn $active={viewMode === 'grid'} onClick={() => setViewMode('grid')}>
                  {renderIcon('FiGrid', { size: 18 })}
                </ViewBtn>
                <ViewBtn $active={viewMode === 'kanban'} onClick={() => setViewMode('kanban')}>
                  {renderIcon('FiLayers', { size: 18 })}
                </ViewBtn>
              </ViewToggle>

              <NotificationBtn>
                {renderIcon('FiBell', { size: 20 })}
                <NotificationBadge>3</NotificationBadge>
              </NotificationBtn>
            </RightSection>
          </TopBar>

          {/* Stats Overview */}
          <StatsOverview>
            <StatCard>
              <StatIcon $color="#2563eb">
                {renderIcon('FiGrid', { size: 22 })}
              </StatIcon>
              <StatInfo>
                <StatValue>{filteredCards.length}</StatValue>
                <StatLabel>Active Modules</StatLabel>
              </StatInfo>
            </StatCard>
            <StatCard>
              <StatIcon $color="#10b981">
                {renderIcon('FiStar', { size: 22 })}
              </StatIcon>
              <StatInfo>
                <StatValue>{favorites.length}</StatValue>
                <StatLabel>Favorites</StatLabel>
              </StatInfo>
            </StatCard>
            <StatCard>
              <StatIcon $color="#f59e0b">
                {renderIcon('FiClock', { size: 22 })}
              </StatIcon>
              <StatInfo>
                <StatValue>{filteredCards.filter(c => c.priority === 'critical' || c.priority === 'high').length}</StatValue>
                <StatLabel>High Priority</StatLabel>
              </StatInfo>
            </StatCard>
            <StatCard>
              <StatIcon $color="#0284c7">
                {renderIcon('FiTrendingUp', { size: 22 })}
              </StatIcon>
              <StatInfo>
                <StatValue>98%</StatValue>
                <StatLabel>Efficiency</StatLabel>
              </StatInfo>
            </StatCard>
          </StatsOverview>

          {/* Content Area */}
          <ContentArea>
            <SectionHeader>
              <SectionTitle>
                {activeCategory === 'all' ? 'All Modules' : activeCategory}
                <ModuleCount>{filteredCards.length}</ModuleCount>
              </SectionTitle>
            </SectionHeader>

            <Suspense fallback={<LoadingSkeleton viewMode={viewMode} />}>
              {viewMode === 'grid' ? (
                <GridContainer>
                  <AnimatePresence mode="wait">
                    {[...filteredCards]
                      .sort((a, b) => {
                        const aFav = favorites.includes(a.id);
                        const bFav = favorites.includes(b.id);
                        if (aFav && !bFav) return -1;
                        if (!aFav && bFav) return 1;
                        return 0;
                      })
                      .map((card) => renderCard({ ...card, isFavorite: favorites.includes(card.id) }))}
                  </AnimatePresence>
                </GridContainer>
              ) : (
                <KanbanContainer>
                  {Object.entries(kanbanGroups).map(([priority, cards]) => (
                    <KanbanColumn key={priority}>
                      <ColumnHeader $priority={priority}>
                        <ColumnTitle>
                          <PriorityDot $priority={priority} />
                          {priority.toUpperCase()}
                        </ColumnTitle>
                        <ColumnCount>{cards.length}</ColumnCount>
                      </ColumnHeader>
                      <ColumnContent>
                        <AnimatePresence>
                          {cards.map((card) => (
                            <motion.div
                              key={card.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                            >
                              {renderCard(card)}
                            </motion.div>
                          ))}
                        </AnimatePresence>
                        {cards.length === 0 && (
                          <EmptyColumn>No items</EmptyColumn>
                        )}
                      </ColumnContent>
                    </KanbanColumn>
                  ))}
                </KanbanContainer>
              )}
            </Suspense>

            {filteredCards.length === 0 && (
              <EmptyState>
                <EmptyIcon>🔍</EmptyIcon>
                <EmptyTitle>No modules found</EmptyTitle>
                <EmptyDesc>Try adjusting your search or category filter</EmptyDesc>
              </EmptyState>
            )}
          </ContentArea>
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
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
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
                      <OptionIcon $color="#2563eb">
                        {renderIcon('FiShoppingCart', { size: 22 })}
                      </OptionIcon>
                      <OptionInfo>
                        <OptionName>Sales Order</OptionName>
                        <OptionDesc>Cancel customer-facing sales orders</OptionDesc>
                      </OptionInfo>
                      {renderIcon('FiArrowRight', { size: 16 })}
                    </OptionItem>
                    <OptionItem onClick={() => handlePick('job')}>
                      <OptionIcon $color="#0284c7">
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

// Loading Skeleton
const LoadingSkeleton = ({ viewMode }) => (
  viewMode === 'grid' ? (
    <GridContainer>
      {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
    </GridContainer>
  ) : (
    <KanbanContainer>
      {[...Array(4)].map((_, i) => (
        <SkeletonColumn key={i}>
          <SkeletonColumnHeader />
          <SkeletonCard />
          <SkeletonCard />
        </SkeletonColumn>
      ))}
    </KanbanContainer>
  )
);

// ========== STYLED COMPONENTS ==========
const DashboardContainer = styled.div`
  display: flex;
  min-height: 100vh;
  background: #ffffff;
`;

const Sidebar = styled.aside`
  width: ${props => props.$collapsed ? '80px' : '280px'};
  background: #ffffff;
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  transition: width 0.2s ease;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  z-index: 100;
`;

const SidebarHeader = styled.div`
  padding: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e2e8f0;
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  ${props => props.$collapsed && 'justify-content: center; width: 100%;'}
`;

const LogoIcon = styled.div`
  width: 42px;
  height: 42px;
  background: #2563eb;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 800;
  font-size: 1.1rem;
`;

const LogoText = styled.span`
  font-weight: 800;
  font-size: 1.1rem;
  color: #0f172a;
`;

const CollapseBtn = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: #64748b;
  padding: 0.5rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  
  &:hover {
    background: #f1f5f9;
    color: #2563eb;
  }
`;

const SidebarNav = styled.nav`
  flex: 1;
  padding: 1rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const NavItem = styled.button`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  width: 100%;
  background: ${props => props.$active ? '#eff6ff' : 'transparent'};
  border: none;
  border-radius: 12px;
  cursor: pointer;
  color: ${props => props.$active ? '#2563eb' : '#1e293b'};
  justify-content: ${props => props.$collapsed ? 'center' : 'flex-start'};
  font-weight: 500;
  font-size: 0.95rem;
  
  &:hover {
    background: ${props => props.$active ? '#eff6ff' : '#f8fafc'};
  }
`;

const NavIcon = styled.span`
  display: flex;
  align-items: center;
  color: ${props => props.$active ? '#2563eb' : '#475569'};
`;

const NavLabel = styled.span`
  flex: 1;
  text-align: left;
  font-weight: 500;
  font-size: 0.95rem;
`;

const NavCount = styled.span`
  font-size: 0.75rem;
  font-weight: 700;
  color: #475569;
  background: #f1f5f9;
  padding: 0.2rem 0.55rem;
  border-radius: 20px;
`;

const SidebarFooter = styled.div`
  padding: 1.5rem;
  border-top: 1px solid #e2e8f0;
  text-align: center;
`;

const FooterText = styled.div`
  font-size: 0.8rem;
  font-weight: 500;
  color: #475569;
`;

const MainContent = styled.main`
  flex: 1;
  padding: 1.5rem 2rem;
  
  @media (max-width: 768px) {
    padding: 1rem;
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

const WelcomeSection = styled.div``;

const Greeting = styled.span`
  font-size: 0.9rem;
  color: #475569;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
`;

const UserName = styled.h2`
  font-size: 1.75rem;
  font-weight: 800;
  color: #0f172a;
  margin-top: 0.25rem;
`;

const RightSection = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const SearchBar = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: white;
  padding: 0.5rem 1rem;
  border-radius: 40px;
  border: 1px solid #e2e8f0;
  color: #94a3b8;
  
  &:focus-within {
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }
`;

const SearchInput = styled.input`
  border: none;
  outline: none;
  background: transparent;
  font-size: 0.95rem;
  width: 200px;
  
  &::placeholder {
    color: #94a3b8;
  }
`;

const ViewToggle = styled.div`
  display: flex;
  gap: 0.25rem;
  background: white;
  padding: 0.25rem;
  border-radius: 40px;
  border: 1px solid #e2e8f0;
`;

const ViewBtn = styled.button`
  background: ${props => props.$active ? '#2563eb' : 'transparent'};
  color: ${props => props.$active ? 'white' : '#475569'};
  border: none;
  padding: 0.5rem 0.75rem;
  border-radius: 30px;
  cursor: pointer;
  display: flex;
  align-items: center;
  font-weight: 500;
  
  &:hover {
    background: ${props => props.$active ? '#2563eb' : '#f1f5f9'};
  }
`;

const NotificationBtn = styled.button`
  position: relative;
  background: white;
  border: 1px solid #e2e8f0;
  padding: 0.5rem;
  border-radius: 40px;
  cursor: pointer;
  display: flex;
  align-items: center;
  color: #475569;
  
  &:hover {
    background: #f8fafc;
  }
`;

const NotificationBadge = styled.span`
  position: absolute;
  top: -4px;
  right: -4px;
  background: #ef4444;
  color: white;
  font-size: 0.65rem;
  padding: 0.1rem 0.4rem;
  border-radius: 20px;
  font-weight: 700;
`;

const StatsOverview = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.25rem;
  margin-bottom: 2rem;
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const StatCard = styled.div`
  background: white;
  padding: 1.25rem;
  border-radius: 20px;
  display: flex;
  align-items: center;
  gap: 1rem;
  border: 1px solid #e2e8f0;
  transition: all 0.2s;
  
  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    border-color: #2563eb30;
  }
`;

const StatIcon = styled.div`
  width: 52px;
  height: 52px;
  background: ${props => `${props.$color}10`};
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => props.$color};
`;

const StatInfo = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
`;

const StatValue = styled.div`
  font-size: 1.75rem;
  font-weight: 800;
  color: #0f172a;
`;

const StatLabel = styled.div`
  font-size: 0.85rem;
  font-weight: 500;
  color: #475569;
`;

const ContentArea = styled.div``;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const SectionTitle = styled.h3`
  font-size: 1.5rem;
  font-weight: 800;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const ModuleCount = styled.span`
  background: #e2e8f0;
  padding: 0.2rem 0.65rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 700;
  color: #1e293b;
`;

const GridContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 1.25rem;
`;

const KanbanContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.25rem;
  overflow-x: auto;
  
  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const KanbanColumn = styled.div`
  background: white;
  border-radius: 20px;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const ColumnHeader = styled.div`
  padding: 1rem 1.25rem;
  background: ${props => PRIORITY_COLORS[props.$priority]?.bg || '#f8fafc'};
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px solid ${props => PRIORITY_COLORS[props.$priority]?.text || '#2563eb'};
`;

const ColumnTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 800;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #1e293b;
`;

const PriorityDot = styled.div`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${props => PRIORITY_COLORS[props.$priority]?.text || '#2563eb'};
`;

const ColumnCount = styled.span`
  background: #e2e8f0;
  padding: 0.2rem 0.6rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
  color: #1e293b;
`;

const ColumnContent = styled.div`
  flex: 1;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-height: 600px;
  overflow-y: auto;
`;

const EmptyColumn = styled.div`
  text-align: center;
  padding: 2rem;
  color: #64748b;
  font-size: 0.9rem;
  font-weight: 500;
`;

const Card = styled(motion.div)`
  background: white;
  border-radius: 18px;
  padding: 1.25rem;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid #e2e8f0;
  position: relative;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
    border-color: #2563eb40;
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
`;

const IconWrapper = styled.div`
  width: 48px;
  height: 48px;
  background: ${props => PRIORITY_COLORS[props.$priority]?.bg || '#eff6ff'};
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => PRIORITY_COLORS[props.$priority]?.text || '#2563eb'};
`;

const FavoriteBtn = styled(motion.button)`
  background: none;
  border: none;
  cursor: pointer;
  color: ${props => props.$isFavorite ? '#f59e0b' : '#cbd5e1'};
  padding: 0.25rem;
  border-radius: 8px;
  
  &:hover {
    color: #f59e0b;
  }
`;

const CardTitle = styled.h4`
  font-size: 1.1rem;
  font-weight: 800;
  margin-bottom: 0.5rem;
  color: #0f172a;
`;

const CardDesc = styled.p`
  font-size: 0.85rem;
  color: #475569;
  margin-bottom: 1rem;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-weight: 500;
`;

const CardFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Badge = styled.span`
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.3rem 0.8rem;
  border-radius: 20px;
  background: ${props => PRIORITY_COLORS[props.$priority]?.bg || '#f1f5f9'};
  color: ${props => PRIORITY_COLORS[props.$priority]?.text || '#475569'};
  text-transform: capitalize;
  display: flex;
  align-items: center;
  gap: 0.35rem;
`;

const BadgeDot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${props => PRIORITY_COLORS[props.$priority]?.text || '#475569'};
`;

const Stats = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.75rem;
  color: #64748b;
  font-weight: 600;
`;

// Skeleton Components
const SkeletonCard = styled.div`
  background: white;
  border-radius: 18px;
  padding: 1.25rem;
  border: 1px solid #e2e8f0;
  animation: ${shimmer} 1.5s infinite;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  height: 160px;
`;

const SkeletonColumn = styled.div`
  background: white;
  border-radius: 20px;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
`;

const SkeletonColumnHeader = styled.div`
  height: 50px;
  background: #e2e8f0;
  border-radius: 12px;
  animation: ${pulse} 1s infinite;
`;

// Modal Components
const ModalOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
`;

const ModalContent = styled(motion.div)`
  background: white;
  border-radius: 28px;
  max-width: 440px;
  width: 100%;
  overflow: hidden;
  box-shadow: 0 20px 35px -10px rgba(0, 0, 0, 0.2);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #e2e8f0;
`;

const ModalTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 800;
  color: #0f172a;
`;

const CloseBtn = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: #94a3b8;
  padding: 0.35rem;
  border-radius: 8px;
  
  &:hover {
    background: #f1f5f9;
  }
`;

const ModalBody = styled.div`
  padding: 1.5rem;
`;

const ModalDesc = styled.p`
  color: #475569;
  margin-bottom: 1.5rem;
  font-size: 0.95rem;
  font-weight: 500;
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
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  cursor: pointer;
  
  &:hover {
    border-color: #2563eb;
    background: #eff6ff;
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
  font-size: 1rem;
  margin-bottom: 0.25rem;
  color: #0f172a;
`;

const OptionDesc = styled.div`
  font-size: 0.8rem;
  color: #64748b;
  font-weight: 500;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem;
  background: white;
  border-radius: 28px;
  border: 1px solid #e2e8f0;
`;

const EmptyIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.6;
`;

const EmptyTitle = styled.h4`
  font-size: 1.2rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  color: #0f172a;
`;

const EmptyDesc = styled.p`
  color: #64748b;
  font-size: 0.9rem;
  font-weight: 500;
`;

export default React.memo(SalesDashboard);