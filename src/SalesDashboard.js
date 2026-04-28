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

/** =========================
 * Modern Layout - Sidebar + Kanban Style Dashboard
 * Enhanced with Elegant Cards, Rich Colors, and Advanced Animations
 * ========================= */

// Enhanced Modern Theme - Rich Dark/Light Fusion with Glassmorphism and Gradient Accents
const THEME = {
  primary: '#6366f1',
  primaryDark: '#4f46e5',
  primaryLight: '#818cf8',
  secondary: '#06b6d4',
  secondaryDark: '#0891b2',
  accent: '#f43f5e',
  accentDark: '#e11d48',
  success: '#10b981',
  successDark: '#059669',
  warning: '#f59e0b',
  warningDark: '#d97706',
  danger: '#ef4444',
  dangerDark: '#dc2626',
  purple: '#8b5cf6',
  pink: '#ec4899',
  indigo: '#4f46e5',
  
  background: '#ffffff',
  backgroundDark: '#0f172a',
  sidebarBg: 'rgba(255, 255, 255, 0.98)',
  cardBg: '#ffffff',
  glassBg: 'rgba(255, 255, 255, 0.85)',
  glassBorder: 'rgba(255, 255, 255, 0.3)',
  
  textPrimary: '#000000',
  textSecondary: '#003175',
  textLight: '#003074',
  textMuted: '#cbd5e1',
  
  border: 'rgba(0, 0, 0, 0.06)',
  borderLight: 'rgba(0, 0, 0, 0.03)',
  
  shadowSm: '0 1px 2px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)',
  shadowMd: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
  shadowLg: '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04)',
  shadowXl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.02)',
  shadowGlow: '0 0 20px rgba(99, 102, 241, 0.15)',
  
  gradientPrimary: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 50%, #818cf8 100%)',
  gradientSecondary: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
  gradientSuccess: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  gradientWarning: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  gradientDanger: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
  gradientPurple: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
  gradientPink: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
  gradientCard: 'linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.95) 100%)',
};

// Enhanced Animations
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

const float = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-5px); }
`;

const glowPulse = keyframes`
  0%, 100% { box-shadow: 0 0 5px rgba(99, 102, 241, 0.3); }
  50% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.5); }
`;

const rotateSlow = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const dash = keyframes`
  to { stroke-dashoffset: 0; }
`;

// Enhanced Card Data with rich metadata
const CARDS = [
  { id: 1, icon: 'FiFileText', title: 'Sales Order Form', description: 'Create and manage customer sales orders with real-time tracking', path: '/sales-order', category: 'Orders', priority: 'high', stats: '24 today', badge: 'urgent', trend: '+12%', color: 'primary' },
  { id: 2, icon: 'FiList', title: 'Order Tracking', description: 'Monitor production status in real-time with analytics', path: '/sales-data', category: 'Orders', priority: 'medium', stats: '12 pending', badge: 'in-progress', trend: '+5%', color: 'secondary' },
  { id: 3, icon: 'FiGrid', title: 'All Orders', description: 'Complete order management system with insights', path: '/all-order-details', category: 'Orders', priority: 'low', stats: '156 total', badge: 'archived', trend: '-3%', color: 'purple' },
  { id: 4, icon: 'FiSettings', title: 'Sample Design', description: 'Submit and track design samples with feedback', path: '/sample-design-form', category: 'Design', priority: 'high', stats: '8 new', badge: 'review', trend: '+25%', color: 'pink' },
  { id: 6, icon: 'FiUsers', title: 'Issued Lot No.', description: 'Fabric issue resolution with batch tracking', path: '/pending-fabric-issues', category: 'Fabric', priority: 'critical', stats: '3 urgent', badge: 'critical', trend: '+40%', color: 'danger' },
  { id: 7, icon: 'FiClipboard', title: 'Cutting Job Order', description: 'Create cutting job orders with precision', path: '/job-order-form', category: 'Cutting', priority: 'high', stats: '5 today', badge: 'active', trend: '+8%', color: 'primary' },
  { id: 8, icon: 'FiList', title: 'All Cutting Jobs', description: 'Manage all cutting orders efficiently', path: '/all-job-orders', category: 'Cutting', priority: 'medium', stats: '42 active', badge: 'ongoing', trend: '+2%', color: 'secondary' },
  { id: 9, icon: 'FiScissors', title: 'Embroidery Challan', description: 'Embroidery order management with quality check', path: '/embroidery-challan', category: 'Embroidery', priority: 'medium', stats: '15 pending', badge: 'waiting', trend: '-5%', color: 'purple' },
  { id: 10, icon: 'FiPrinter', title: 'Printing Challan', description: 'Printing order tracking with color management', path: '/printing-challan', category: 'Printing', priority: 'high', stats: '8 today', badge: 'new', trend: '+18%', color: 'pink' },
  { id: 11, icon: 'FiScissors', title: 'Cutting Details', description: 'Cutting budget calculator with analytics', path: '/cutting-budget', category: 'Cutting', priority: 'low', stats: '3 entries', badge: 'draft', trend: '0%', color: 'primary' },
  { id: 12, icon: 'FiPackage', title: 'Cutting Records', description: 'Historical cutting data with patterns', path: '/details', category: 'Cutting', priority: 'low', stats: '28 records', badge: 'completed', trend: '+15%', color: 'success' },
  { id: 13, icon: 'FiBox', title: 'Embroidery Pending', description: 'Pending embroidery challans with deadlines', path: '/emb-pending-challan', category: 'Embroidery', priority: 'critical', stats: '7 pending', badge: 'delayed', trend: '+30%', color: 'danger' },
  { id: 14, icon: 'FiPrinter', title: 'Printing Pending', description: 'Pending printing challans with status', path: '/printing-pending-challan', category: 'Printing', priority: 'high', stats: '4 pending', badge: 'urgent', trend: '+22%', color: 'warning' },
  { id: 15, icon: 'FiTag', title: 'SOP Documents', description: 'Standard operating procedures and guidelines', path: '/sop', category: 'Documents', priority: 'low', stats: 'Updated', badge: 'info', trend: 'New', color: 'secondary' },
  { id: 16, icon: 'FiX', title: 'Cancel Order', description: 'Order cancellation workflow with approvals', path: '/cancel-order', category: 'Orders', priority: 'medium', stats: '2 today', badge: 'warning', trend: '-8%', color: 'danger' },
  { id: 17, icon: 'FiClipboard', title: 'Material Requisition', description: 'Material planning form with inventory sync', path: '/material-requisition-form', category: 'Planning', priority: 'high', stats: '4 new', badge: 'pending', trend: '+35%', color: 'primary' },
  { id: 18, icon: 'FiTrendingUp', title: 'Requisition Dashboard', description: 'Material analytics dashboard with KPIs', path: '/material-requisition-dashboard', category: 'Planning', priority: 'medium', stats: 'Live', badge: 'active', trend: '+28%', color: 'success' },
  { id: 19, icon: 'FiUsers', title: 'Parta Details', description: 'Parta information management system', path: '/parta-details', category: 'Production', priority: 'medium', stats: '6 entries', badge: 'completed', trend: '+4%', color: 'purple' },
  { id: 20, icon: 'FiPackage', title: 'Packing Report', description: 'Update packing reports with quality control', path: '/packing-report', category: 'Logistics', priority: 'high', stats: '9 pending', badge: 'in-progress', trend: '+16%', color: 'secondary' },
];

// Categories for sidebar with gradient icons
const SIDEBAR_ITEMS = [
  { id: 'all', label: 'All Modules', icon: 'FiGrid', count: CARDS.length, gradient: THEME.gradientPrimary },
  { id: 'Orders', label: 'Orders', icon: 'FiShoppingCart', count: CARDS.filter(c => c.category === 'Orders').length, gradient: THEME.gradientPrimary },
  { id: 'Cutting', label: 'Cutting', icon: 'FiScissors', count: CARDS.filter(c => c.category === 'Cutting').length, gradient: THEME.gradientSecondary },
  { id: 'Embroidery', label: 'Embroidery', icon: 'FiBox', count: CARDS.filter(c => c.category === 'Embroidery').length, gradient: THEME.gradientPurple },
  { id: 'Printing', label: 'Printing', icon: 'FiPrinter', count: CARDS.filter(c => c.category === 'Printing').length, gradient: THEME.gradientPink },
  { id: 'Planning', label: 'Planning', icon: 'FiTrendingUp', count: CARDS.filter(c => c.category === 'Planning').length, gradient: THEME.gradientSuccess },
  { id: 'Design', label: 'Design', icon: 'FiSettings', count: CARDS.filter(c => c.category === 'Design').length, gradient: THEME.gradientWarning },
  { id: 'Fabric', label: 'Fabric', icon: 'FiUsers', count: CARDS.filter(c => c.category === 'Fabric').length, gradient: THEME.gradientDanger },
  { id: 'Documents', label: 'Documents', icon: 'FiFileText', count: CARDS.filter(c => c.category === 'Documents').length, gradient: THEME.gradientSecondary },
  { id: 'Logistics', label: 'Logistics', icon: 'FiPackage', count: CARDS.filter(c => c.category === 'Logistics').length, gradient: THEME.gradientPurple },
  { id: 'Production', label: 'Production', icon: 'FiSettings', count: CARDS.filter(c => c.category === 'Production').length, gradient: THEME.gradientPrimary },
];

// Enhanced priority colors with gradients
const PRIORITY_COLORS = {
  critical: { bg: 'linear-gradient(135deg, #ef444415 0%, #dc262615 100%)', text: '#ef4444', border: '#ef4444', glow: 'rgba(239, 68, 68, 0.2)' },
  high: { bg: 'linear-gradient(135deg, #f43f5e15 0%, #e11d4815 100%)', text: '#f43f5e', border: '#f43f5e', glow: 'rgba(244, 63, 94, 0.2)' },
  medium: { bg: 'linear-gradient(135deg, #f59e0b15 0%, #d9770615 100%)', text: '#f59e0b', border: '#f59e0b', glow: 'rgba(245, 158, 11, 0.2)' },
  low: { bg: 'linear-gradient(135deg, #10b98115 0%, #05966915 100%)', text: '#10b981', border: '#10b981', glow: 'rgba(16, 185, 129, 0.2)' },
};

const CARD_COLORS = {
  primary: { gradient: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', light: 'rgba(99, 102, 241, 0.1)' },
  secondary: { gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', light: 'rgba(6, 182, 212, 0.1)' },
  success: { gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', light: 'rgba(16, 185, 129, 0.1)' },
  warning: { gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', light: 'rgba(245, 158, 11, 0.1)' },
  danger: { gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', light: 'rgba(239, 68, 68, 0.1)' },
  purple: { gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', light: 'rgba(139, 92, 246, 0.1)' },
  pink: { gradient: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)', light: 'rgba(236, 72, 153, 0.1)' },
};

const CANCEL_ROUTES = {
  sale: '/cancel-order/sales',
  job: '/cancel-order/job',
};

// Icon mapping
const iconComponents = {
  FiFileText, FiList, FiArrowRight, FiTrendingUp, FiUsers, FiSettings, FiClipboard,
  FiPrinter, FiScissors, FiStar, FiX, FiShoppingCart, FiLayers, FiBox, FiPackage,
  FiTag, FiGrid, FiClock, FiMenu, FiHome, FiBarChart2, FiBell, FiSearch, FiMoreVertical,
  FiActivity, FiCheckCircle, FiAlertCircle,
};

// Global Styles with enhanced typography
const GlobalStyle = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Poppins', sans-serif;
    background: ${THEME.background};
    color: ${THEME.textPrimary};
    overflow-x: hidden;
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
    background: #cbd5e1;
    border-radius: 10px;
    transition: all 0.2s;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: ${THEME.primary};
  }

  @keyframes gradientShift {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
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
  const [hoveredCard, setHoveredCard] = useState(null);

  useEffect(() => {
    localStorage.setItem('favoriteModulesModern', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') setShowCancelPicker(false);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

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

  // Group cards by priority for Kanban view
  const kanbanGroups = useMemo(() => {
    const groups = {
      critical: [],
      high: [],
      medium: [],
      low: [],
    };
    
    filteredCards.forEach(card => {
      const isFav = favorites.includes(card.id);
      groups[card.priority].push({ ...card, isFavorite: isFav });
    });
    
    return groups;
  }, [filteredCards, favorites]);

  // Enhanced card render with elegant design
  const renderCard = (card) => {
    const cardColor = getCardColor(card.color);
    const isHovered = hoveredCard === card.id;
    
    return (
      <Card
        key={card.id}
        onClick={() => handleCardClick(card)}
        $priority={card.priority}
        $cardColor={cardColor}
        $isHovered={isHovered}
        onMouseEnter={() => setHoveredCard(card.id)}
        onMouseLeave={() => setHoveredCard(null)}
        whileHover={{ y: -8, transition: { duration: 0.2 } }}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3, type: "spring", stiffness: 300 }}
      >
        <CardGlow $priority={card.priority} />
        <CardHeader>
          <IconWrapper $priority={card.priority} $cardColor={cardColor}>
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
          <BadgeContainer>
            <Badge $priority={card.priority}>
              <BadgeDot $priority={card.priority} />
              {card.badge || card.priority}
            </Badge>
            {card.trend && (
              <TrendBadge $positive={!card.trend.startsWith('-')}>
                {card.trend}
                {renderIcon('FiTrendingUp', { size: 10 })}
              </TrendBadge>
            )}
          </BadgeContainer>
          <Stats>
            {renderIcon('FiClock', { size: 12 })}
            <span>{card.stats}</span>
          </Stats>
        </CardFooter>
        <CardDecoration />
      </Card>
    );
  };

  return (
    <>
      <GlobalStyle />
      <DashboardContainer>
        {/* Enhanced Sidebar */}
        <Sidebar $collapsed={sidebarCollapsed}>
          <SidebarHeader>
            <Logo $collapsed={sidebarCollapsed}>
              <LogoIcon>
                <LogoGlow />
                MH
              </LogoIcon>
              {!sidebarCollapsed && <LogoText>MH Dashboard</LogoText>}
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
                whileHover={{ x: sidebarCollapsed ? 0 : 8 }}
                transition={{ type: "spring", stiffness: 400 }}
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
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <FooterText>Production Suite v3.0</FooterText>
                <FooterSub>Enterprise Ready</FooterSub>
              </motion.div>
            )}
          </SidebarFooter>
        </Sidebar>

        {/* Main Content */}
        <MainContent>
          {/* Enhanced Top Bar */}
          <TopBar>
            <WelcomeSection>
              <Greeting>
                <GreetingIcon>✨</GreetingIcon>
                Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}
              </Greeting>
              <UserName>Production Manager</UserName>
            </WelcomeSection>

            <RightSection>
              <SearchBar
                whileFocus={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                {renderIcon('FiSearch', { size: 18 })}
                <SearchInput 
                  type="text" 
                  placeholder="Search modules..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </SearchBar>
              
              <ViewToggle>
                <ViewBtn 
                  $active={viewMode === 'grid'} 
                  onClick={() => setViewMode('grid')}
                  whileTap={{ scale: 0.95 }}
                >
                  {renderIcon('FiGrid', { size: 18 })}
                </ViewBtn>
                <ViewBtn 
                  $active={viewMode === 'kanban'} 
                  onClick={() => setViewMode('kanban')}
                  whileTap={{ scale: 0.95 }}
                >
                  {renderIcon('FiLayers', { size: 18 })}
                </ViewBtn>
              </ViewToggle>

              <NotificationBtn whileTap={{ scale: 0.95 }}>
                {renderIcon('FiBell', { size: 20 })}
                <NotificationBadge>
                  <motion.span
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  >
                    3
                  </motion.span>
                </NotificationBadge>
              </NotificationBtn>
            </RightSection>
          </TopBar>

          {/* Enhanced Stats Overview */}
          <StatsOverview>
            <StatCard whileHover={{ y: -4, transition: { duration: 0.2 } }}>
              <StatIcon $color={THEME.primary}>
                {renderIcon('FiGrid', { size: 22 })}
              </StatIcon>
              <StatInfo>
                <StatValue>{filteredCards.length}</StatValue>
                <StatLabel>Active Modules</StatLabel>
              </StatInfo>
              <StatTrend $positive>+12%</StatTrend>
            </StatCard>
            <StatCard whileHover={{ y: -4, transition: { duration: 0.2 } }}>
              <StatIcon $color={THEME.success}>
                {renderIcon('FiStar', { size: 22 })}
              </StatIcon>
              <StatInfo>
                <StatValue>{favorites.length}</StatValue>
                <StatLabel>Favorites</StatLabel>
              </StatInfo>
              <StatTrend $positive>+5%</StatTrend>
            </StatCard>
            <StatCard whileHover={{ y: -4, transition: { duration: 0.2 } }}>
              <StatIcon $color={THEME.warning}>
                {renderIcon('FiClock', { size: 22 })}
              </StatIcon>
              <StatInfo>
                <StatValue>{filteredCards.filter(c => c.priority === 'critical' || c.priority === 'high').length}</StatValue>
                <StatLabel>High Priority</StatLabel>
              </StatInfo>
              <StatTrend $positive={false}>+8%</StatTrend>
            </StatCard>
            <StatCard whileHover={{ y: -4, transition: { duration: 0.2 } }}>
              <StatIcon $color={THEME.secondary}>
                {renderIcon('FiTrendingUp', { size: 22 })}
              </StatIcon>
              <StatInfo>
                <StatValue>98%</StatValue>
                <StatLabel>Efficiency</StatLabel>
              </StatInfo>
              <StatTrend $positive>+2%</StatTrend>
            </StatCard>
          </StatsOverview>

          {/* Content Area */}
          <ContentArea>
            <SectionHeader>
              <SectionTitle>
                {activeCategory === 'all' ? 'All Modules' : activeCategory}
                <ModuleCount>{filteredCards.length}</ModuleCount>
              </SectionTitle>
              {favorites.length > 0 && (
                <FavHint
                  as={motion.div}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  {renderIcon('FiStar', { size: 14, fill: '#f59e0b', color: '#f59e0b' })}
                  Starred items appear first
                </FavHint>
              )}
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
                    <KanbanColumn
                      key={priority}
                      as={motion.div}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3 }}
                    >
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
                              transition={{ duration: 0.2 }}
                            >
                              {renderCard(card)}
                            </motion.div>
                          ))}
                        </AnimatePresence>
                        {cards.length === 0 && (
                          <EmptyColumn>
                            <EmptyIcon>📭</EmptyIcon>
                            No items
                          </EmptyColumn>
                        )}
                      </ColumnContent>
                    </KanbanColumn>
                  ))}
                </KanbanContainer>
              )}
            </Suspense>

            {filteredCards.length === 0 && (
              <EmptyState
                as={motion.div}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <EmptyIcon>🔍</EmptyIcon>
                <EmptyTitle>No modules found</EmptyTitle>
                <EmptyDesc>Try adjusting your search or category filter</EmptyDesc>
              </EmptyState>
            )}
          </ContentArea>
        </MainContent>

        {/* Enhanced Cancel Modal */}
        <AnimatePresence>
          {showCancelPicker && (
            <ModalOverlay
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCancelPicker(false)}
            >
              <ModalContent
                initial={{ scale: 0.9, opacity: 0, y: 30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 30 }}
                transition={{ type: "spring", damping: 25 }}
                onClick={(e) => e.stopPropagation()}
              >
                <ModalHeader>
                  <ModalTitle>Cancel Order</ModalTitle>
                  <CloseBtn onClick={() => setShowCancelPicker(false)} whileTap={{ scale: 0.9 }}>
                    {renderIcon('FiX', { size: 20 })}
                  </CloseBtn>
                </ModalHeader>
                <ModalBody>
                  <ModalDesc>Select the type of order you want to cancel</ModalDesc>
                  <OptionGrid>
                    <OptionItem 
                      onClick={() => handlePick('sale')}
                      whileHover={{ x: 8, transition: { duration: 0.2 } }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <OptionIcon $color={THEME.primary}>
                        {renderIcon('FiShoppingCart', { size: 24 })}
                      </OptionIcon>
                      <OptionInfo>
                        <OptionName>Sales Order</OptionName>
                        <OptionDesc>Cancel customer-facing sales orders</OptionDesc>
                      </OptionInfo>
                      <ArrowIcon>{renderIcon('FiArrowRight', { size: 16 })}</ArrowIcon>
                    </OptionItem>
                    <OptionItem 
                      onClick={() => handlePick('job')}
                      whileHover={{ x: 8, transition: { duration: 0.2 } }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <OptionIcon $color={THEME.secondary}>
                        {renderIcon('FiLayers', { size: 24 })}
                      </OptionIcon>
                      <OptionInfo>
                        <OptionName>Job Order</OptionName>
                        <OptionDesc>Cancel internal production job orders</OptionDesc>
                      </OptionInfo>
                      <ArrowIcon>{renderIcon('FiArrowRight', { size: 16 })}</ArrowIcon>
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

// Loading Skeleton with shimmer effect
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

// ========== ENHANCED STYLED COMPONENTS ==========
const DashboardContainer = styled.div`
  display: flex;
  min-height: 100vh;
  background: ${THEME.background};
`;

const Sidebar = styled.aside`
  width: ${props => props.$collapsed ? '80px' : '280px'};
  background: ${THEME.sidebarBg};
  backdrop-filter: blur(20px);
  border-right: 1px solid ${THEME.border};
  display: flex;
  flex-direction: column;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  z-index: 100;
  
  &::-webkit-scrollbar {
    width: 4px;
  }
`;

const SidebarHeader = styled.div`
  padding: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid ${THEME.border};
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  ${props => props.$collapsed && 'justify-content: center; width: 100%;'}
`;

const LogoIcon = styled.div`
  position: relative;
  width: 42px;
  height: 42px;
  background: ${THEME.gradientPrimary};
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 800;
  font-size: 1.1rem;
  overflow: hidden;
`;

const LogoGlow = styled.div`
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.3), transparent);
  border-radius: 14px;
`;

const LogoText = styled.span`
  font-weight: 800;
  font-size: 1.2rem;
  background: ${THEME.gradientPrimary};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-size: 200% auto;
  animation: gradientShift 3s ease infinite;
`;

const CollapseBtn = styled(motion.button)`
  background: none;
  border: none;
  cursor: pointer;
  color: ${THEME.textSecondary};
  padding: 0.5rem;
  border-radius: 10px;
  display: flex;
  align-items: center;
  transition: all 0.2s;
  
  &:hover {
    background: ${THEME.border};
    color: ${THEME.primary};
  }
`;

const SidebarNav = styled.nav`
  flex: 1;
  padding: 1rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const NavItem = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  width: 100%;
  background: ${props => props.$active ? `${THEME.primary}10` : 'transparent'};
  border: none;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s;
  color: ${props => props.$active ? THEME.primary : THEME.textSecondary};
  justify-content: ${props => props.$collapsed ? 'center' : 'flex-start'};
  position: relative;
  
  &:hover {
    background: ${props => props.$active ? `${THEME.primary}15` : `${THEME.border}`};
  }
`;

const NavIcon = styled.span`
  display: flex;
  align-items: center;
  color: ${props => props.$active ? THEME.primary : THEME.textSecondary};
`;

const NavLabel = styled.span`
  flex: 1;
  text-align: left;
  font-weight: 500;
  font-size: 0.9rem;
`;

const NavCount = styled.span`
  font-size: 0.7rem;
  font-weight: 600;
  color: ${THEME.textSecondary};
  background: ${THEME.border};
  padding: 0.2rem 0.5rem;
  border-radius: 20px;
  min-width: 28px;
  text-align: center;
`;

const SidebarFooter = styled.div`
  padding: 1.5rem;
  border-top: 1px solid ${THEME.border};
  text-align: center;
`;

const FooterText = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${THEME.textSecondary};
`;

const FooterSub = styled.div`
  font-size: 0.7rem;
  color: ${THEME.textLight};
  margin-top: 0.25rem;
`;

const MainContent = styled.main`
  flex: 1;
  overflow-x: hidden;
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

const WelcomeSection = styled.div`
  display: flex;
  flex-direction: column;
`;

const Greeting = styled.span`
  font-size: 0.85rem;
  color: ${THEME.textLight};
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const GreetingIcon = styled.span`
  font-size: 1rem;
`;

const UserName = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  background: ${THEME.gradientPrimary};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const RightSection = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const SearchBar = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: white;
  padding: 0.5rem 1rem;
  border-radius: 40px;
  border: 1px solid ${THEME.border};
  color: ${THEME.textLight};
  transition: all 0.2s;
  
  &:focus-within {
    border-color: ${THEME.primary};
    box-shadow: 0 0 0 3px ${THEME.primary}20;
  }
`;

const SearchInput = styled.input`
  border: none;
  outline: none;
  background: transparent;
  font-size: 0.9rem;
  width: 200px;
  
  &::placeholder {
    color: ${THEME.textLight};
  }
`;

const ViewToggle = styled.div`
  display: flex;
  gap: 0.25rem;
  background: white;
  padding: 0.25rem;
  border-radius: 40px;
  border: 1px solid ${THEME.border};
`;

const ViewBtn = styled(motion.button)`
  background: ${props => props.$active ? THEME.primary : 'transparent'};
  color: ${props => props.$active ? 'white' : THEME.textSecondary};
  border: none;
  padding: 0.5rem;
  border-radius: 30px;
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: all 0.2s;
  
  &:hover {
    background: ${props => props.$active ? THEME.primary : THEME.border};
  }
`;

const NotificationBtn = styled(motion.button)`
  position: relative;
  background: white;
  border: 1px solid ${THEME.border};
  padding: 0.5rem;
  border-radius: 40px;
  cursor: pointer;
  display: flex;
  align-items: center;
  color: ${THEME.textSecondary};
  
  &:hover {
    background: ${THEME.border};
    color: ${THEME.primary};
  }
`;

const NotificationBadge = styled.span`
  position: absolute;
  top: -4px;
  right: -4px;
  background: ${THEME.gradientDanger};
  color: white;
  font-size: 0.6rem;
  padding: 0.15rem 0.4rem;
  border-radius: 20px;
  font-weight: 700;
  min-width: 18px;
  text-align: center;
`;

const StatsOverview = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const StatCard = styled(motion.div)`
  background: white;
  padding: 1rem;
  border-radius: 20px;
  display: flex;
  align-items: center;
  gap: 1rem;
  border: 1px solid ${THEME.border};
  transition: all 0.2s;
  position: relative;
  overflow: hidden;
  
  &:hover {
    box-shadow: ${THEME.shadowLg};
    border-color: ${THEME.primary}30;
  }
`;

const StatIcon = styled.div`
  width: 48px;
  height: 48px;
  background: ${props => `${props.$color}15`};
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
  font-size: 1.5rem;
  font-weight: 800;
  color: ${THEME.textPrimary};
`;

const StatLabel = styled.div`
  font-size: 0.75rem;
  color: ${THEME.textLight};
`;

const StatTrend = styled.div`
  font-size: 0.7rem;
  font-weight: 600;
  color: ${props => props.$positive ? THEME.success : THEME.danger};
  background: ${props => props.$positive ? `${THEME.success}10` : `${THEME.danger}10`};
  padding: 0.2rem 0.5rem;
  border-radius: 20px;
`;

const ContentArea = styled.div`
  background: transparent;
  border-radius: 20px;
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
`;

const SectionTitle = styled.h3`
  font-size: 1.4rem;
  font-weight: 700;
  color: ${THEME.textPrimary};
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ModuleCount = styled.span`
  background: ${THEME.border};
  padding: 0.2rem 0.6rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
`;

const FavHint = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: ${THEME.textLight};
  background: ${THEME.warning}10;
  padding: 0.3rem 0.8rem;
  border-radius: 20px;
`;

const GridContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 1.5rem;
`;

const KanbanContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.25rem;
  overflow-x: auto;
  min-height: 500px;
  
  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const KanbanColumn = styled(motion.div)`
  background: ${THEME.glassBg};
  backdrop-filter: blur(8px);
  border-radius: 24px;
  border: 1px solid ${THEME.border};
  display: flex;
  flex-direction: column;
  height: fit-content;
  min-height: 400px;
  overflow: hidden;
`;

const ColumnHeader = styled.div`
  padding: 1rem 1.25rem;
  background: ${props => PRIORITY_COLORS[props.$priority]?.bg || `${THEME.primary}10`};
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px solid ${props => PRIORITY_COLORS[props.$priority]?.border || THEME.primary};
`;

const ColumnTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 800;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const PriorityDot = styled.div`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${props => PRIORITY_COLORS[props.$priority]?.text || THEME.primary};
  box-shadow: 0 0 5px ${props => PRIORITY_COLORS[props.$priority]?.text || THEME.primary};
`;

const ColumnCount = styled.span`
  background: rgba(0,0,0,0.05);
  padding: 0.2rem 0.6rem;
  border-radius: 20px;
  font-size: 0.7rem;
  font-weight: 700;
`;

const ColumnContent = styled.div`
  flex: 1;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: 600px;
  overflow-y: auto;
`;

const EmptyColumn = styled.div`
  text-align: center;
  padding: 2rem;
  color: ${THEME.textLight};
  font-size: 0.85rem;
`;

const EmptyIcon = styled.div`
  font-size: 2rem;
  margin-bottom: 0.5rem;
  opacity: 0.5;
`;

// Enhanced Card Component
const Card = styled(motion.div)`
  background: ${THEME.gradientCard};
  border-radius: 20px;
  padding: 1.25rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid ${THEME.border};
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(4px);
  
  &:before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: ${props => PRIORITY_COLORS[props.$priority]?.gradient || THEME.gradientPrimary};
    transform: scaleX(${props => props.$isHovered ? 1 : 0});
    transition: transform 0.3s ease;
  }
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: ${THEME.shadowXl};
    border-color: ${props => PRIORITY_COLORS[props.$priority]?.border || THEME.primary}40;
  }
`;

const CardGlow = styled.div`
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 30% 20%, ${props => PRIORITY_COLORS[props.$priority]?.glow || 'rgba(99, 102, 241, 0.1)'}, transparent 70%);
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
  
  ${Card}:hover & {
    opacity: 1;
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
  background: ${props => PRIORITY_COLORS[props.$priority]?.bg || `${THEME.primary}10`};
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => PRIORITY_COLORS[props.$priority]?.text || THEME.primary};
  transition: all 0.3s ease;
  
  ${Card}:hover & {
    transform: scale(1.05);
  }
`;

const FavoriteBtn = styled(motion.button)`
  background: none;
  border: none;
  cursor: pointer;
  color: ${props => props.$isFavorite ? '#f59e0b' : THEME.textLight};
  padding: 0.25rem;
  border-radius: 8px;
  transition: all 0.2s;
  
  &:hover {
    transform: scale(1.1);
    color: #f59e0b;
  }
`;

const CardTitle = styled.h4`
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  color: ${THEME.textPrimary};
`;

const CardDesc = styled.p`
  font-size: 0.8rem;
  color: ${THEME.textSecondary};
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

const BadgeContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

const Badge = styled.span`
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  background: ${props => PRIORITY_COLORS[props.$priority]?.bg || `${THEME.primary}10`};
  color: ${props => PRIORITY_COLORS[props.$priority]?.text || THEME.primary};
  text-transform: capitalize;
  display: flex;
  align-items: center;
  gap: 0.3rem;
`;

const BadgeDot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${props => PRIORITY_COLORS[props.$priority]?.text || THEME.primary};
`;

const TrendBadge = styled.span`
  font-size: 0.65rem;
  font-weight: 600;
  padding: 0.2rem 0.5rem;
  border-radius: 20px;
  background: ${props => props.$positive ? `${THEME.success}15` : `${THEME.danger}15`};
  color: ${props => props.$positive ? THEME.success : THEME.danger};
  display: flex;
  align-items: center;
  gap: 0.2rem;
`;

const Stats = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.7rem;
  color: ${THEME.textLight};
  font-weight: 500;
`;

const CardDecoration = styled.div`
  position: absolute;
  bottom: 0;
  right: 0;
  width: 60px;
  height: 60px;
  background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
  border-radius: 50%;
  pointer-events: none;
`;

// Skeleton Components
const SkeletonCard = styled.div`
  background: white;
  border-radius: 20px;
  padding: 1.25rem;
  border: 1px solid ${THEME.border};
  animation: ${shimmer} 1.5s infinite;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  height: 160px;
`;

const SkeletonColumn = styled.div`
  background: ${THEME.glassBg};
  border-radius: 24px;
  border: 1px solid ${THEME.border};
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.75rem;
`;

const SkeletonColumnHeader = styled.div`
  height: 50px;
  background: #e2e8f0;
  border-radius: 16px;
  animation: ${pulse} 1s infinite;
`;

// Modal Components
const ModalOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
`;

const ModalContent = styled(motion.div)`
  background: white;
  border-radius: 32px;
  max-width: 440px;
  width: 100%;
  overflow: hidden;
  box-shadow: ${THEME.shadowXl};
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid ${THEME.border};
`;

const ModalTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 800;
  background: ${THEME.gradientPrimary};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const CloseBtn = styled(motion.button)`
  background: none;
  border: none;
  cursor: pointer;
  color: ${THEME.textLight};
  padding: 0.25rem;
  border-radius: 10px;
  
  &:hover {
    background: ${THEME.border};
    color: ${THEME.textSecondary};
  }
`;

const ModalBody = styled.div`
  padding: 1.5rem;
`;

const ModalDesc = styled.p`
  color: ${THEME.textSecondary};
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
`;

const OptionGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const OptionItem = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid ${THEME.border};
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    border-color: ${THEME.primary};
    background: ${THEME.primary}05;
  }
`;

const OptionIcon = styled.div`
  width: 48px;
  height: 48px;
  background: ${props => `${props.$color}15`};
  border-radius: 16px;
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
  margin-bottom: 0.25rem;
`;

const OptionDesc = styled.div`
  font-size: 0.75rem;
  color: ${THEME.textLight};
`;

const ArrowIcon = styled.div`
  color: ${THEME.textLight};
  transition: transform 0.2s;
  
  ${OptionItem}:hover & {
    transform: translateX(4px);
    color: ${THEME.primary};
  }
`;

const EmptyState = styled(motion.div)`
  text-align: center;
  padding: 4rem;
  background: white;
  border-radius: 32px;
  border: 1px solid ${THEME.border};
`;

const EmptyTitle = styled.h4`
  font-size: 1.2rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
`;

const EmptyDesc = styled.p`
  color: ${THEME.textLight};
  font-size: 0.9rem;
`;

export default React.memo(SalesDashboard);