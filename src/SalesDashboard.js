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

// Premium Pearl & Alabaster Light Theme System
const THEME = {
  bg: '#ffffffff',
  cardBg: '#ffffff',
  border: '#e2e8f0',
  borderHover: '#cbd5e1',
  text: {
    primary: '#0f172a',
    secondary: '#475569',
    muted: '#94a3b8',
  },
  accent: {
    indigo: '#4f46e5',
    indigoLight: '#e0e7ff',
    purple: '#8b5cf6',
    purpleLight: '#f3e8ff',
    cyan: '#0891b2',
    cyanLight: '#ecfeff',
    emerald: '#10b981',
    emeraldLight: '#d1fae5',
    amber: '#d97706',
    amberLight: '#fef3c7',
    rose: '#e11d48',
    roseLight: '#ffe4e6',
  },
  shadow: {
    sm: '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.025)',
    md: '0 10px 15px -3px rgba(15, 23, 42, 0.04), 0 4px 6px -2px rgba(15, 23, 42, 0.02)',
    lg: '0 20px 25px -5px rgba(15, 23, 42, 0.06), 0 10px 10px -5px rgba(15, 23, 42, 0.03)',
    glow: '0 8px 30px rgba(79, 70, 229, 0.08)',
  }
};

// Production Pipeline Stages Configuration
const PIPELINE_STAGES = [
  { id: 'sales_planning', label: 'Sales & Planning', color: '#4f46e5', rgb: '79, 70, 229', icon: 'FiShoppingCart' },
  { id: 'material_cutting', label: 'Material & Cutting', color: '#0891b2', rgb: '8, 145, 178', icon: 'FiScissors' },
  { id: 'embellish_processing', label: 'Embellishments & Process', color: '#8b5cf6', rgb: '139, 92, 246', icon: 'FiBox' },
  { id: 'logistics_reference', label: 'Logistics & Reference', color: '#10b981', rgb: '16, 185, 129', icon: 'FiPackage' }
];

const getCardStage = (cardId) => {
  if ([1, 2, 3, 16, 17, 18].includes(cardId)) return 'sales_planning';
  if ([4, 6, 7, 8, 11, 12].includes(cardId)) return 'material_cutting';
  if ([9, 10, 13, 14, 19].includes(cardId)) return 'embellish_processing';
  return 'logistics_reference';
};

const getPriorityStyles = (priority) => {
  const styles = {
    critical: {
      color: '#e11d48',
      bgColor: '#ffe4e6',
      borderColor: '#fecdd3',
      rgb: '225, 29, 72'
    },
    high: {
      color: '#d97706',
      bgColor: '#fef3c7',
      borderColor: '#fde68a',
      rgb: '217, 119, 6'
    },
    medium: {
      color: '#2563eb',
      bgColor: '#dbeafe',
      borderColor: '#bfdbfe',
      rgb: '37, 99, 235'
    },
    low: {
      color: '#059669',
      bgColor: '#d1fae5',
      borderColor: '#a7f3d0',
      rgb: '5, 150, 101'
    },
  };
  return styles[priority] || { color: '#475569', bgColor: '#f1f5f9', borderColor: '#e2e8f0', rgb: '71, 85, 105' };
};

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
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
  { id: 'all', label: 'Overview', icon: 'FiGrid', color: '#4f46e5' },
  { id: 'Orders', label: 'Orders', icon: 'FiShoppingCart', color: '#2563eb' },
  { id: 'Cutting', label: 'Cutting', icon: 'FiScissors', color: '#0891b2' },
  { id: 'Embroidery', label: 'Embroidery', icon: 'FiBox', color: '#8b5cf6' },
  { id: 'Printing', label: 'Printing', icon: 'FiPrinter', color: '#d97706' },
  { id: 'Planning', label: 'Planning', icon: 'FiTrendingUp', color: '#059669' },
  { id: 'Design', label: 'Design', icon: 'FiSettings', color: '#db2777' },
  { id: 'Fabric', label: 'Fabric', icon: 'FiUsers', color: '#e11d48' },
  { id: 'Documents', label: 'Documents', icon: 'FiFileText', color: '#475569' },
  { id: 'Logistics', label: 'Logistics', icon: 'FiPackage', color: '#2563eb' },
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

// Global Styles Override
const GlobalStyle = createGlobalStyle`
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Outfit:wght@300;400;500;600;700;800&display=swap');

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: 'Plus Jakarta Sans', 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
    background-color: ${THEME.bg} !important;
    color: ${THEME.text.primary} !important;
    overflow-x: hidden;
  }

  html, body, #root {
    background-color: ${THEME.bg} !important;
  }

  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  ::-webkit-scrollbar-track {
    background: #f1f5f9;
  }

  ::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 10px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
`;

const SalesDashboard = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCancelPicker, setShowCancelPicker] = useState(false);
  const [viewMode, setViewMode] = useState('board'); // 'board' or 'list'
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('favoriteModulesModern');
    return saved ? JSON.parse(saved) : [1, 4, 7];
  });

  useEffect(() => {
    document.title = "Workspace Control Center | Manufacturing Hub";
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

  const favoriteCardsData = useMemo(() => {
    return CARDS.filter(c => favorites.includes(c.id));
  }, [favorites]);

  return (
    <>
      <GlobalStyle />
      <DashboardContainer>
        {/* Top Control Bar */}
        <TopBar>
          <WelcomeSection>
            <GreetingIcon>✨</GreetingIcon>
            <GreetingText>
              Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : ' Evening'},
              <span> Production Manager</span>
            </GreetingText>
          </WelcomeSection>

          <ActionGroup>
            {/* View Mode Toggle */}
            <ViewModeToggle>
              <ToggleButton
                $active={viewMode === 'board'}
                onClick={() => setViewMode('board')}
              >
                {renderIcon('FiLayers', { size: 14 })}
                <span>Pipeline Board</span>
              </ToggleButton>
              <ToggleButton
                $active={viewMode === 'list'}
                onClick={() => setViewMode('list')}
              >
                {renderIcon('FiList', { size: 14 })}
                <span>Workspace List</span>
              </ToggleButton>
            </ViewModeToggle>

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
              {renderIcon('FiBell', { size: 18 })}
              <NotificationBadge>3</NotificationBadge>
            </NotificationBtn>
          </ActionGroup>
        </TopBar>

        {/* Mobile Horizontal Scrolling Tabs */}
        <MobileCategoryList>
          {CATEGORIES.map((category) => (
            <MobileCategoryItem
              key={category.id}
              $active={activeCategory === category.id}
              onClick={() => setActiveCategory(category.id)}
            >
              {renderIcon(category.icon, { size: 14 })}
              <span>{category.label}</span>
            </MobileCategoryItem>
          ))}
        </MobileCategoryList>

        {/* Split Pane Layout */}
        <WorkspaceLayout>

          {/* Left Pane: Categories Navigation & Favorites Bookmarks */}
          <LeftPane>
            <CategoryCard>
              <CategoryTitle>Workspace Categories</CategoryTitle>
              {CATEGORIES.map((category) => (
                <NavItem
                  key={category.id}
                  $active={activeCategory === category.id}
                  onClick={() => setActiveCategory(category.id)}
                >
                  <NavIcon $active={activeCategory === category.id} $color={category.color}>
                    {renderIcon(category.icon, { size: 16 })}
                  </NavIcon>
                  <NavLabel>{category.label}</NavLabel>
                </NavItem>
              ))}
            </CategoryCard>

            <FavoritesCard>
              <CategoryTitle>Quick Favorites</CategoryTitle>
              <FavList>
                {favoriteCardsData.map((card) => (
                  <FavItem key={card.id} onClick={() => handleCardClick(card)}>
                    {renderIcon(card.icon, { size: 14, color: THEME.accent.indigo })}
                    <span>{card.title}</span>
                  </FavItem>
                ))}
                {favoriteCardsData.length === 0 && (
                  <div style={{ fontSize: '0.75rem', color: THEME.text.muted, padding: '0.5rem', textAlign: 'center' }}>
                    No favorites added yet
                  </div>
                )}
              </FavList>
            </FavoritesCard>
          </LeftPane>

          {/* Right Pane: Stats Cards + Workspaces (Board / List View) */}
          <RightPane>
            {/* KPI Stats deck */}
            <StatsGrid>
              <StatCard>
                <StatIcon $color={THEME.accent.indigo} $bgColor="rgba(79, 70, 229, 0.08)" $borderColor="rgba(79, 70, 229, 0.15)">
                  {renderIcon('FiGrid', { size: 20 })}
                </StatIcon>
                <StatInfo>
                  <StatValue>{filteredCards.length}</StatValue>
                  <StatLabel>Active Modules</StatLabel>
                </StatInfo>
              </StatCard>

              <StatCard>
                <StatIcon $color={THEME.accent.amber} $bgColor="rgba(217, 119, 6, 0.08)" $borderColor="rgba(217, 119, 6, 0.15)">
                  {renderIcon('FiStar', { size: 20 })}
                </StatIcon>
                <StatInfo>
                  <StatValue>{favorites.length}</StatValue>
                  <StatLabel>Favorites</StatLabel>
                </StatInfo>
              </StatCard>

              <StatCard>
                <StatIcon $color={THEME.accent.rose} $bgColor="rgba(225, 29, 72, 0.08)" $borderColor="rgba(225, 29, 72, 0.15)">
                  {renderIcon('FiClock', { size: 20 })}
                </StatIcon>
                <StatInfo>
                  <StatValue>{filteredCards.filter(c => c.priority === 'critical' || c.priority === 'high').length}</StatValue>
                  <StatLabel>High Priority</StatLabel>
                </StatInfo>
              </StatCard>

              <StatCard>
                <StatIcon $color={THEME.accent.emerald} $bgColor="rgba(16, 185, 129, 0.08)" $borderColor="rgba(16, 185, 129, 0.15)">
                  {renderIcon('FiTrendingUp', { size: 20 })}
                </StatIcon>
                <StatInfo>
                  <StatValue>98%</StatValue>
                  <StatLabel>Efficiency Rate</StatLabel>
                </StatInfo>
              </StatCard>
            </StatsGrid>

            {/* Content Switcher Section */}
            <ModulesSection>
              <SectionHeader>
                <SectionTitle>
                  {activeCategory === 'all' ? 'All Workspace' : activeCategory}
                  <ModuleCount>{filteredCards.length}</ModuleCount>
                </SectionTitle>
                <ResetFiltersBtn onClick={() => { setActiveCategory('all'); setSearchQuery(''); }}>
                  Reset Filters
                  {renderIcon('FiArrowRight', { size: 14 })}
                </ResetFiltersBtn>
              </SectionHeader>

              <Suspense fallback={<LoadingGrid />}>
                {viewMode === 'board' ? (
                  /* WORKFLOW PIPELINE BOARD (KANBAN FORMAT) */
                  <BoardLayout>
                    {PIPELINE_STAGES.map((stage) => {
                      const stageCards = filteredCards.filter(c => getCardStage(c.id) === stage.id);
                      return (
                        <BoardColumn key={stage.id}>
                          <ColumnHeader $color={stage.color}>
                            <ColumnTitleGroup>
                              <ColumnTitle>{stage.label}</ColumnTitle>
                              <span>{stageCards.length}</span>
                            </ColumnTitleGroup>
                            <ColumnIcon $color={stage.color}>
                              {renderIcon(stage.icon, { size: 16 })}
                            </ColumnIcon>
                          </ColumnHeader>

                          <BoardColumnBody>
                            <AnimatePresence mode="popLayout">
                              {stageCards
                                .sort((a, b) => {
                                  const aFav = favorites.includes(a.id);
                                  const bFav = favorites.includes(b.id);
                                  if (aFav && !bFav) return -1;
                                  if (!aFav && bFav) return 1;
                                  return 0;
                                })
                                .map((card) => {
                                  const pStyle = getPriorityStyles(card.priority);
                                  return (
                                    <RowCard
                                      key={card.id}
                                      onClick={() => handleCardClick(card)}
                                      $priorityColor={pStyle.color}
                                      whileHover={{ y: -2 }}
                                      layout
                                      initial={{ opacity: 0, scale: 0.95 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      exit={{ opacity: 0, scale: 0.95 }}
                                      transition={{ duration: 0.18 }}
                                    >
                                      <RowIcon $color={pStyle.color} $bgColor={pStyle.bgColor}>
                                        {renderIcon(card.icon, { size: 18 })}
                                      </RowIcon>
                                      <RowContent>
                                        <RowTitleGroup>
                                          <RowTitle>{card.title}</RowTitle>
                                        </RowTitleGroup>
                                        <RowDesc>{card.description}</RowDesc>
                                      </RowContent>
                                      <RowRight>
                                        <RowFavBtn
                                          onClick={(e) => toggleFavorite(card.id, e)}
                                          whileTap={{ scale: 0.9 }}
                                        >
                                          {renderIcon('FiStar', {
                                            size: 13,
                                            fill: favorites.includes(card.id) ? THEME.accent.amber : 'none',
                                            stroke: favorites.includes(card.id) ? THEME.accent.amber : THEME.text.muted
                                          })}
                                        </RowFavBtn>
                                        {renderIcon('FiArrowRight', { size: 14, color: THEME.accent.indigo })}
                                      </RowRight>
                                    </RowCard>
                                  );
                                })}
                            </AnimatePresence>
                            {stageCards.length === 0 && (
                              <ColumnEmptyState>No active items</ColumnEmptyState>
                            )}
                          </BoardColumnBody>
                        </BoardColumn>
                      );
                    })}
                  </BoardLayout>
                ) : (
                  /* WORKSPACE LIST VIEW (HIGH DENSITY ROW TABLE FORMAT) */
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <tr>
                          <Th style={{ width: '35%' }}>Module Name</Th>
                          <Th style={{ width: '30%' }}>Description</Th>
                          <Th style={{ width: '15%' }}>Category</Th>
                          <Th style={{ width: '10%' }}>Priority</Th>
                          <Th style={{ width: '10%', textAlign: 'right' }}>Actions</Th>
                        </tr>
                      </TableHead>
                      <TableBody>
                        <AnimatePresence mode="popLayout">
                          {[...filteredCards]
                            .sort((a, b) => {
                              const aFav = favorites.includes(a.id);
                              const bFav = favorites.includes(b.id);
                              if (aFav && !bFav) return -1;
                              if (!aFav && bFav) return 1;
                              return 0;
                            })
                            .map((card) => {
                              const pStyle = getPriorityStyles(card.priority);
                              return (
                                <Tr key={card.id} onClick={() => handleCardClick(card)}>
                                  <Td>
                                    <ListModuleCell>
                                      <ListIconWrapper $color={pStyle.color} $bgColor={pStyle.bgColor}>
                                        {renderIcon(card.icon, { size: 18 })}
                                      </ListIconWrapper>
                                      <div>
                                        <ListModuleTitle>{card.title}</ListModuleTitle>
                                        <div style={{ fontSize: '0.7rem', color: THEME.text.muted }}>{card.stats}</div>
                                      </div>
                                    </ListModuleCell>
                                  </Td>
                                  <Td>
                                    <ListModuleDesc>{card.description}</ListModuleDesc>
                                  </Td>
                                  <Td>
                                    <CategoryBadge>{card.category}</CategoryBadge>
                                  </Td>
                                  <Td>
                                    <PriorityBadge $color={pStyle.color} $bgColor={pStyle.bgColor} $borderColor={pStyle.borderColor}>
                                      <BadgeDot $color={pStyle.color} />
                                      {card.priority}
                                    </PriorityBadge>
                                  </Td>
                                  <Td style={{ textAlign: 'right' }}>
                                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                                      <FavoriteBtn
                                        $isFavorite={favorites.includes(card.id)}
                                        onClick={(e) => toggleFavorite(card.id, e)}
                                        whileTap={{ scale: 0.9 }}
                                      >
                                        {renderIcon('FiStar', {
                                          size: 14,
                                          fill: favorites.includes(card.id) ? THEME.accent.amber : 'none',
                                          stroke: favorites.includes(card.id) ? THEME.accent.amber : THEME.text.muted
                                        })}
                                      </FavoriteBtn>
                                      <LaunchBtn onClick={() => handleCardClick(card)}>
                                        {renderIcon('FiArrowRight', { size: 14 })}
                                      </LaunchBtn>
                                    </div>
                                  </Td>
                                </Tr>
                              );
                            })}
                        </AnimatePresence>
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Suspense>

              {filteredCards.length === 0 && (
                <EmptyState>
                  <EmptyIcon>🔍</EmptyIcon>
                  <EmptyTitle>No modules found</EmptyTitle>
                  <EmptyDesc>Try adjusting your search or category filter</EmptyDesc>
                </EmptyState>
              )}
            </ModulesSection>
          </RightPane>

        </WorkspaceLayout>
      </DashboardContainer>

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
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              onClick={(e) => e.stopPropagation()}
            >
              <ModalHeader>
                <ModalTitle>Cancel Order</ModalTitle>
                <CloseBtn onClick={() => setShowCancelPicker(false)}>
                  {renderIcon('FiX', { size: 18 })}
                </CloseBtn>
              </ModalHeader>
              <ModalBody>
                <ModalDesc>Select the type of order you want to cancel</ModalDesc>
                <OptionGrid>
                  <OptionItem onClick={() => handlePick('sale')}>
                    <OptionIcon $color="#4f46e5" $bgColor="#e0e7ff" $borderColor="#c7d2fe">
                      {renderIcon('FiShoppingCart', { size: 20 })}
                    </OptionIcon>
                    <OptionInfo>
                      <OptionName>Sales Order</OptionName>
                      <OptionDesc>Cancel customer-facing sales orders</OptionDesc>
                    </OptionInfo>
                    {renderIcon('FiArrowRight', { size: 16 })}
                  </OptionItem>
                  <OptionItem onClick={() => handlePick('job')}>
                    <OptionIcon $color="#0891b2" $bgColor="#ecfeff" $borderColor="#c5f2f7">
                      {renderIcon('FiLayers', { size: 20 })}
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
    </>
  );
};

// Loading Components
const LoadingGrid = () => (
  <BoardLayout>
    {[...Array(4)].map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </BoardLayout>
);

const SkeletonCard = styled.div`
  background: #ffffffff;
  border-radius: 20px;
  padding: 1.5rem;
  animation: ${shimmer} 1.5s infinite;
  background: linear-gradient(90deg, #ffffffff 25%, #ffffffff 50%, #ffffffff 75%);
  background-size: 200% 100%;
  height: 350px;
  border: 1px solid ${THEME.border};
`;

// ========== STYLED COMPONENTS ==========

const DashboardContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: ${THEME.bg};
  padding: 2.25rem 2rem;
  max-width: 1950px;
  margin: 0 auto;
  position: relative;
  
  @media (max-width: 768px) {
    padding: 1.25rem 1rem;
  }
`;

const WorkspaceLayout = styled.div`
  display: flex;
  gap: 2rem;
  margin-top: 2rem;
  
  @media (max-width: 1024px) {
    flex-direction: column;
    gap: 1.5rem;
  }
`;

const LeftPane = styled.div`
  width: 260px;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  flex-shrink: 0;
  
  @media (max-width: 1024px) {
    display: none;
  }
`;

const RightPane = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;

const CategoryCard = styled.div`
  background: ${THEME.cardBg};
  border: 1px solid ${THEME.border};
  border-radius: 24px;
  padding: 1.25rem;
  box-shadow: ${THEME.shadow.md};
`;

const FavoritesCard = styled.div`
  background: ${THEME.cardBg};
  border: 1px solid ${THEME.border};
  border-radius: 24px;
  padding: 1.25rem;
  box-shadow: ${THEME.shadow.md};
`;

const CategoryTitle = styled.h4`
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${THEME.text.muted};
  margin-bottom: 0.85rem;
  font-weight: 800;
  padding-left: 0.4rem;
`;

const NavItem = styled.button`
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.65rem 0.85rem;
  width: 100%;
  background: ${props => props.$active ? 'rgba(79, 70, 229, 0.06)' : 'transparent'};
  border: none;
  border-radius: 12px;
  cursor: pointer;
  color: ${props => props.$active ? THEME.accent.indigo : THEME.text.secondary};
  font-weight: 600;
  font-size: 0.85rem;
  text-align: left;
  transition: all 0.2s ease;
  margin-bottom: 0.25rem;
  
  &:hover {
    background: rgba(79, 70, 229, 0.04);
    color: ${THEME.text.primary};
  }
`;

const NavIcon = styled.span`
  display: flex;
  align-items: center;
  color: ${props => props.$active ? props.$color : 'inherit'};
`;

const NavLabel = styled.span`
  flex: 1;
  text-align: left;
  font-weight: 600;
`;

const FavList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`;

const FavItem = styled.button`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem 0.65rem;
  border-radius: 10px;
  width: 100%;
  text-align: left;
  font-size: 0.8rem;
  font-weight: 600;
  color: ${THEME.text.secondary};
  transition: all 0.2s;
  
  &:hover {
    background: #f1f5f9;
    color: ${THEME.accent.indigo};
  }
`;

const TopBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 1.75rem;
  border-bottom: 1px solid ${THEME.border};
  flex-wrap: wrap;
  gap: 1.25rem;
`;

const WelcomeSection = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const GreetingIcon = styled.span`
  font-size: 1.4rem;
`;

const GreetingText = styled.span`
  font-size: 0.95rem;
  color: ${THEME.text.secondary};
  
  span {
    font-weight: 800;
    color: ${THEME.text.primary};
  }
`;

const ActionGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    width: 100%;
  }
`;

const ViewModeToggle = styled.div`
  display: flex;
  background: #f1f5f9;
  padding: 0.25rem;
  border-radius: 12px;
  border: 1px solid ${THEME.border};
  box-shadow: ${THEME.shadow.sm};
  
  @media (max-width: 580px) {
    width: 100%;
  }
`;

const ToggleButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.5rem 0.85rem;
  border: none;
  background: ${props => props.$active ? '#ffffff' : 'transparent'};
  color: ${props => props.$active ? THEME.accent.indigo : THEME.text.secondary};
  border-radius: 9px;
  font-weight: 700;
  font-size: 0.75rem;
  cursor: pointer;
  box-shadow: ${props => props.$active ? '0 1px 3px rgba(0,0,0,0.05)' : 'none'};
  transition: all 0.15s ease;
  
  &:hover {
    color: ${THEME.text.primary};
  }

  @media (max-width: 580px) {
    flex: 1;
  }
`;

const SearchBar = styled.div`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  background: #ffffff;
  padding: 0.65rem 1.1rem;
  border-radius: 14px;
  border: 1px solid ${THEME.border};
  color: ${THEME.text.secondary};
  transition: all 0.2s ease;
  width: 260px;
  box-shadow: ${THEME.shadow.sm};
  
  &:focus-within {
    border-color: ${THEME.accent.indigo};
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1), ${THEME.shadow.sm};
    color: ${THEME.text.primary};
  }

  @media (max-width: 768px) {
    width: 100%;
  }
`;

const SearchInput = styled.input`
  border: none;
  outline: none;
  background: transparent;
  font-size: 0.85rem;
  color: ${THEME.text.primary};
  width: 100%;
  
  &::placeholder {
    color: ${THEME.text.muted};
  }
`;

const NotificationBtn = styled.button`
  position: relative;
  background: #ffffff;
  border: 1px solid ${THEME.border};
  padding: 0.65rem;
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  color: ${THEME.text.secondary};
  transition: all 0.2s;
  box-shadow: ${THEME.shadow.sm};
  
  &:hover {
    background: #f8fafc;
    border-color: ${THEME.borderHover};
    color: ${THEME.text.primary};
  }
`;

const NotificationBadge = styled.span`
  position: absolute;
  top: -3px;
  right: -3px;
  background: ${THEME.accent.rose};
  color: #ffffff;
  font-size: 0.6rem;
  padding: 0.1rem 0.35rem;
  border-radius: 20px;
  font-weight: 800;
  box-shadow: 0 0 6px ${THEME.accent.rose};
`;

const MobileCategoryList = styled.div`
  display: none;
  gap: 0.6rem;
  overflow-x: auto;
  padding: 0.25rem 0 0.75rem 0;
  margin-bottom: 1rem;
  -webkit-overflow-scrolling: touch;
  
  &::-webkit-scrollbar {
    display: none;
  }
  
  @media (max-width: 1024px) {
    display: flex;
  }
`;

const MobileCategoryItem = styled.button`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1rem;
  border-radius: 12px;
  border: 1px solid ${props => props.$active ? THEME.accent.indigo : THEME.border};
  background: ${props => props.$active ? 'rgba(79, 70, 229, 0.06)' : '#ffffff'};
  color: ${props => props.$active ? THEME.accent.indigo : THEME.text.secondary};
  font-weight: 600;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: ${THEME.shadow.sm};
  
  &:active {
    transform: scale(0.97);
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.25rem;
  
  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 580px) {
    grid-template-columns: 1fr;
  }
`;

const StatCard = styled.div`
  background: #ffffff;
  padding: 1.25rem 1.5rem;
  border-radius: 20px;
  display: flex;
  align-items: center;
  gap: 1.25rem;
  border: 1px solid ${THEME.border};
  box-shadow: ${THEME.shadow.md};
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  &:hover {
    transform: translateY(-4px);
    border-color: ${THEME.borderHover};
    box-shadow: ${THEME.shadow.lg}, ${THEME.shadow.glow};
  }
`;

const StatIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => props.$color || '#ffffff'};
  background: ${props => props.$bgColor};
  border: 1px solid ${props => props.$borderColor || 'transparent'};
  flex-shrink: 0;
`;

const StatInfo = styled.div`
  display: flex;
  flex-direction: column;
`;

const StatValue = styled.div`
  font-size: 1.6rem;
  font-weight: 800;
  color: ${THEME.text.primary};
  line-height: 1.2;
`;

const StatLabel = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${THEME.text.secondary};
  margin-top: 0.1rem;
`;

const ModulesSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const SectionTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 800;
  color: ${THEME.text.primary};
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ModuleCount = styled.span`
  background: #f1f5f9;
  border: 1px solid ${THEME.border};
  padding: 0.15rem 0.5rem;
  border-radius: 20px;
  font-size: 0.7rem;
  font-weight: 700;
  color: ${THEME.text.secondary};
`;

const ResetFiltersBtn = styled.button`
  background: none;
  border: none;
  font-size: 0.8rem;
  font-weight: 700;
  color: ${THEME.accent.indigo};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  transition: all 0.2s;
  
  &:hover {
    gap: 0.6rem;
    color: ${THEME.text.primary};
  }
`;

/* KANBAN PIPELINE BOARD STYLES */

const BoardLayout = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.25rem;
  align-items: start;
  
  @media (max-width: 1440px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const BoardColumn = styled.div`
  background: #ffffff;
  border: 1px solid ${THEME.border};
  border-radius: 22px;
  padding: 1.25rem 1rem;
  box-shadow: ${THEME.shadow.md};
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-height: 480px;
  min-width: 0;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: ${THEME.borderHover};
    box-shadow: ${THEME.shadow.lg};
  }
`;

const ColumnHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 2px solid ${props => props.$color};
  padding-bottom: 0.75rem;
  margin-bottom: 0.25rem;
  padding-left: 0.25rem;
  padding-right: 0.25rem;
`;

const ColumnTitleGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: ${THEME.text.primary};
  
  span {
    font-size: 0.7rem;
    color: ${THEME.text.secondary};
    background: #f1f5f9;
    padding: 0.15rem 0.45rem;
    border-radius: 10px;
    font-weight: 800;
  }
`;

const ColumnTitle = styled.h4`
  font-size: 0.8rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.4px;
`;

const ColumnIcon = styled.div`
  color: ${props => props.$color};
  display: flex;
  align-items: center;
`;

const BoardColumnBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  flex: 1;
`;

const RowCard = styled(motion.div)`
  background: #ffffff;
  border: 1px solid ${THEME.border};
  border-left: 4px solid ${props => props.$priorityColor};
  border-radius: 16px;
  padding: 0.9rem;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  box-shadow: 0 1px 2px rgba(0,0,0,0.01);
  min-width: 0;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  
  &:hover {
    border-color: ${THEME.accent.indigo};
    transform: translateY(-2px);
    box-shadow: ${THEME.shadow.md};
  }
`;

const RowIcon = styled.div`
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: ${props => props.$bgColor};
  color: ${props => props.$color};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const RowContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const RowTitleGroup = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.35rem;
`;

const RowTitle = styled.h5`
  font-size: 0.85rem;
  font-weight: 700;
  color: ${THEME.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const RowDesc = styled.p`
  font-size: 0.75rem;
  color: ${THEME.text.secondary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 0.1rem;
`;

const RowRight = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-shrink: 0;
`;

const RowFavBtn = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 6px;
  display: flex;
  align-items: center;
  color: ${THEME.text.muted};
  transition: background 0.15s;
  
  &:hover {
    background: #f1f5f9;
  }
`;

const ColumnEmptyState = styled.div`
  text-align: center;
  padding: 2rem 1rem;
  color: ${THEME.text.muted};
  font-size: 0.75rem;
  font-weight: 600;
  border: 1px dashed ${THEME.border};
  border-radius: 14px;
  background: #fcfdfe;
`;

/* TABLE LIST VIEW STYLES */

const TableContainer = styled.div`
  background: #ffffff;
  border: 1px solid ${THEME.border};
  border-radius: 24px;
  box-shadow: ${THEME.shadow.md};
  overflow: hidden;
  
  @media (max-width: 768px) {
    overflow-x: auto;
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  
  @media (max-width: 768px) {
    min-width: 650px;
  }
`;

const TableHead = styled.thead`
  background: #f8fafc;
  border-bottom: 1px solid ${THEME.border};
`;

const Th = styled.th`
  padding: 1.1rem 1.25rem;
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  color: ${THEME.text.secondary};
  letter-spacing: 0.5px;
`;

const TableBody = styled.tbody``;

const Tr = styled.tr`
  border-bottom: 1px solid ${THEME.border};
  transition: all 0.15s ease;
  cursor: pointer;
  
  &:hover {
    background: #f8fafc;
  }
  
  &:last-child {
    border-bottom: none;
  }
`;

const Td = styled.td`
  padding: 1rem 1.25rem;
  vertical-align: middle;
`;

const ListModuleCell = styled.div`
  display: flex;
  align-items: center;
  gap: 0.85rem;
`;

const ListIconWrapper = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: ${props => props.$bgColor};
  color: ${props => props.$color};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const ListModuleTitle = styled.div`
  font-weight: 700;
  font-size: 0.85rem;
  color: ${THEME.text.primary};
`;

const ListModuleDesc = styled.div`
  font-size: 0.8rem;
  color: ${THEME.text.secondary};
  line-height: 1.4;
`;

const CategoryBadge = styled.span`
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.2rem 0.6rem;
  border-radius: 20px;
  background: #f1f5f9;
  border: 1px solid ${THEME.border};
  color: ${THEME.text.secondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const FavoriteBtn = styled(motion.button)`
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.35rem;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  
  &:hover {
    background: #f1f5f9;
  }
`;

const LaunchBtn = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: ${THEME.accent.indigo};
  transition: background 0.15s;
  
  &:hover {
    background: #f1f5f9;
  }
`;

const PriorityBadge = styled.span`
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.2rem 0.65rem;
  border-radius: 20px;
  background: ${props => props.$bgColor};
  border: 1px solid ${props => props.$borderColor || 'transparent'};
  color: ${props => props.$color};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
`;

const BadgeDot = styled.span`
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: ${props => props.$color};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  background: #ffffff;
  border-radius: 24px;
  border: 1px solid ${THEME.border};
  max-width: 460px;
  margin: 2rem auto;
  box-shadow: ${THEME.shadow.md};
`;

const EmptyIcon = styled.div`
  font-size: 2.5rem;
  margin-bottom: 1rem;
  opacity: 0.6;
`;

const EmptyTitle = styled.h4`
  font-size: 1.05rem;
  font-weight: 700;
  margin-bottom: 0.3rem;
  color: ${THEME.text.primary};
`;

const EmptyDesc = styled.p`
  color: ${THEME.text.secondary};
  font-size: 0.8rem;
`;

/* CANCEL MODAL STYLES */

const ModalOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
`;

const ModalContent = styled(motion.div)`
  background: #ffffff;
  border-radius: 24px;
  max-width: 440px;
  width: 100%;
  overflow: hidden;
  box-shadow: ${THEME.shadow.lg};
  border: 1px solid ${THEME.border};
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid ${THEME.border};
`;

const ModalTitle = styled.h3`
  font-size: 1.15rem;
  font-weight: 800;
  color: ${THEME.text.primary};
`;

const CloseBtn = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: ${THEME.text.secondary};
  padding: 0.35rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background: #f1f5f9;
    color: ${THEME.text.primary};
  }
`;

const ModalBody = styled.div`
  padding: 1.5rem;
`;

const ModalDesc = styled.p`
  color: ${THEME.text.secondary};
  margin-bottom: 1.5rem;
  font-size: 0.85rem;
  line-height: 1.5;
`;

const OptionGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const OptionItem = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid ${THEME.border};
  background: #ffffff;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: ${THEME.shadow.sm};
  
  &:hover {
    border-color: ${THEME.accent.indigo};
    background: #f8fafc;
    transform: translateY(-2px);
  }
`;

const OptionIcon = styled.div`
  width: 44px;
  height: 44px;
  background: ${props => props.$bgColor};
  border: 1px solid ${props => props.$borderColor || 'transparent'};
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => props.$color};
  flex-shrink: 0;
`;

const OptionInfo = styled.div`
  flex: 1;
`;

const OptionName = styled.div`
  font-weight: 700;
  font-size: 0.95rem;
  margin-bottom: 0.15rem;
  color: ${THEME.text.primary};
`;

const OptionDesc = styled.div`
  font-size: 0.75rem;
  color: ${THEME.text.secondary};
`;

export default React.memo(SalesDashboard);