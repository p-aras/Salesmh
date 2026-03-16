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

/** =========================
 * Enhanced Sales Dashboard
 * ========================= */

// Theme as constants for better performance
const THEME = {
  primary: '#00026d',
  primaryLight: '#000853',
  primaryDark: '#040050',
  secondary: '#10b981',
  accent: '#8b5cf6',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#06b6d4',
  background: '#f8fafc',
  cardBackground: '#ffffff',
  textPrimary: '#0f172a',
  textSecondary: '#00337a',
  textLight: '#0015ce',
  border: '#979797',
  shadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  hoverShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  gradient: 'linear-gradient(145deg, #15008a 0%, #12003b 100%)',
  gradientLight: 'linear-gradient(145deg, #00095a 0%, #0e0036 100%)',
};

// Animations
const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

// Pre-defined card data - UPDATED with new card
const CARDS = [
  { id: 1,  icon: 'FiFileText', title: 'Sales Order Form', description: 'Create, edit and submit new sales orders', path: '/sales-order', color: '#6366f1', category: 'Orders', stats: '24 today' },
  { id: 2,  icon: 'FiList', title: 'Order Tracking', description: 'Monitor production status and view order info', path: '/sales-data', color: '#06b6d4', category: 'Orders', stats: '12 pending' },
  { id: 3,  icon: 'FiGrid', title: 'All Orders', description: 'View complete list of all sales orders', path: '/all-order-details', color: '#8b5cf6', category: 'Orders', stats: '156 total' },
  { id: 4,  icon: 'FiSettings', title: 'Sample Design Form', description: 'Submit and manage design samples', path: '/sample-design-form', color: '#f59e0b', category: 'Production', stats: '8 new' },
  { id: 6,  icon: 'FiUsers', title: 'Issued Lot No.', description: 'View orders pending fabric issue resolution', path: '/pending-fabric-issues', color: '#f97316', category: 'Production', stats: '3 urgent' },
  { id: 7,  icon: 'FiClipboard', title: 'Cutting Job Order Form', description: 'Create job orders with fabric details', path: '/job-order-form', color: '#ec4899', category: 'Cutting', stats: '5 today' },
  { id: 8,  icon: 'FiList', title: 'All Cutting Job Orders', description: 'View and manage all created job orders', path: '/all-job-orders', color: '#14b8a6', category: 'Cutting', stats: '42 active' },
  { id: 9,  icon: 'FiScissors', title: 'Embroidery Challan', description: 'Create and manage embroidery challans', path: '/embroidery-challan', color: '#84cc16', category: 'Challan', stats: '15 pending' },
  { id: 10, icon: 'FiPrinter', title: 'Printing Challan', description: 'Generate and tracking printing challans', path: '/printing-challan', color: '#06b6d4', category: 'Challan', stats: '8 today' },
  { id: 11, icon: 'FiScissors', title: 'Cutting Details Entry', description: 'Calculate and manage cutting budgets', path: '/cutting-budget', color: '#6366f1', category: 'Cutting', stats: '3 entries' },
  { id: 12, icon: 'FiPackage', title: 'View Cutting Details', description: 'Access detailed cutting records', path: '/details', color: '#d946ef', category: 'Cutting', stats: '28 records' },
  { id: 13, icon: 'FiBox', title: 'Embroidery Pending Challan', description: 'Access detailed embroidery records', path: '/emb-pending-challan', color: '#f43f5e', category: 'Challan', stats: '7 pending' },
  { id: 14, icon: 'FiPrinter', title: 'Printing Pending Challan', description: 'Access detailed printing records', path: '/printing-pending-challan', color: '#f97316', category: 'Challan', stats: '4 pending' },
  { id: 15, icon: 'FiTag', title: 'SOP of Embroidery/Printing', description: 'Detailed SOP for better productivity', path: '/sop', color: '#ef4444', category: 'Production', stats: 'Updated' },
  { id: 16, icon: 'FiX', title: 'Order Cancelled Form', description: 'Filling cancellation details', path: '/cancel-order', color: '#64748b', category: 'Production', stats: '2 today' },
  { id: 17, icon: 'FiClipboard', title: 'Material Requisition Planning Form', description: 'Create and manage material requisition plans', path: '/material-requisition-form', color: '#10b981', category: 'Planning', stats: '4 new' },
  { id: 18, icon: 'FiTrendingUp', title: 'Material Requisition Dashboard', description: 'Monitor and analyze material requisition status', path: '/material-requisition-dashboard', color: '#8b5cf6', category: 'Planning', stats: 'Live' },
  { id: 19, icon: 'FiUsers', title: 'Enter Parta Details', description: 'Add and manage Parta information and details', path: '/parta-details', color: '#10b981', category: 'Production', stats: '6 entries' },
  // NEW CARD ADDED HERE
  { id: 20, icon: 'FiPackage', title: 'Update Packing Report', description: 'Update and manage packing reports for orders', path: '/packing-report', color: '#22c55e', category: 'Production', stats: '9 pending' },
];

// Optional: If you want to add a new 'Packing' category, uncomment the line below and update the card's category to 'Packing'
// const CATEGORIES = ['All', 'Orders', 'Production', 'Cutting', 'Challan', 'Planning', 'Packing'];
const CATEGORIES = ['All', 'Orders', 'Production', 'Cutting', 'Challan', 'Planning'];

const CANCEL_ROUTES = {
  sale: '/cancel-order/sales',
  job: '/cancel-order/job',
};

// Icon mapping for lazy loading
const iconComponents = {
  FiFileText,
  FiList,
  FiArrowRight,
  FiTrendingUp,
  FiUsers,
  FiSettings,
  FiClipboard,
  FiPrinter,
  FiScissors,
  FiStar,
  FiX,
  FiShoppingCart,
  FiLayers,
  FiBox,
  FiPackage,
  FiTag,
  FiGrid,
  FiClock,
};

// Motion variants as constants
const CONTAINER_VARIANTS = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1, 
    transition: { 
      staggerChildren: 0.05, 
      delayChildren: 0.1,
      when: "beforeChildren"
    } 
  },
};

const CARD_VARIANTS = {
  hidden: { y: 30, opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1, 
    transition: { 
      duration: 0.4,
      type: "spring",
      stiffness: 100
    } 
  },
};

// Global styles
const GlobalStyle = createGlobalStyle`
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  
  html, body, #root {
    height: 100%;
    overflow-x: hidden;
  }
  
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    background: ${THEME.background};
    color: ${THEME.textPrimary};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  
  button, input {
    font-family: inherit;
  }
  
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  
  ::-webkit-scrollbar-track {
    background: ${THEME.border};
    border-radius: 10px;
  }
  
  ::-webkit-scrollbar-thumb {
    background: ${THEME.textLight};
    border-radius: 10px;
  }
  
  ::-webkit-scrollbar-thumb:hover {
    background: ${THEME.textSecondary};
  }
`;

// Main Component
const SalesDashboard = () => {
  const navigate = useNavigate();
  const [activeCat, setActiveCat] = useState('All');
  const [showCancelPicker, setShowCancelPicker] = useState(false);
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('favoriteModules');
    return saved ? JSON.parse(saved) : [];
  });

  // Save favorites to localStorage
  useEffect(() => {
    localStorage.setItem('favoriteModules', JSON.stringify(favorites));
  }, [favorites]);

  // Escape key handler
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') setShowCancelPicker(false);
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  // Memoized filtered cards
  const filteredCards = useMemo(() => {
    return CARDS.filter((card) => {
      return activeCat === 'All' || card.category === activeCat;
    });
  }, [activeCat]);

  // Memoized handlers
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

  const handleCategoryChange = useCallback((category) => {
    setActiveCat(category);
  }, []);

  const toggleFavorite = useCallback((cardId, e) => {
    e.stopPropagation();
    setFavorites(prev => {
      if (prev.includes(cardId)) {
        return prev.filter(id => id !== cardId);
      } else {
        return [...prev, cardId];
      }
    });
  }, []);

  // Render icon component
  const renderIcon = (iconName, props = {}) => {
    const IconComponent = iconComponents[iconName];
    return IconComponent ? <IconComponent {...props} /> : <div style={{ width: 24, height: 24 }} />;
  };

  return (
    <>
      <GlobalStyle />
      <PageWrap>
        {/* Animated Background */}
        <BackgroundGradient />
        <BackgroundPattern />
        
        {/* Modern Header */}
        <Header>
          <HeaderContent>
            <TitleSection>
              <TitleBadge
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                🏭 Production Management System
              </TitleBadge>
              
              <MainTitle
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                MH DASHBOARD
              </MainTitle>
              
              <Subtitle
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                Streamline your production pipeline with real-time tracking and smart workflows.
              </Subtitle>
            </TitleSection>

            {/* Category Filters */}
            <ControlsSection
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <CategoryFilters>
                {CATEGORIES.map((category) => {
                  const count = category === 'All' 
                    ? CARDS.length 
                    : CARDS.filter(c => c.category === category).length;
                  
                  return (
                    <CategoryButton
                      key={category}
                      $active={activeCat === category}
                      onClick={() => handleCategoryChange(category)}
                    >
                      {category}
                      <CategoryCount $active={activeCat === category}>
                        {count}
                      </CategoryCount>
                    </CategoryButton>
                  );
                })}
              </CategoryFilters>
            </ControlsSection>
          </HeaderContent>
        </Header>

        {/* Main Content */}
        <MainContent>
          <ContentHeader>
            <div>
              <SectionTitle>Quick Access Modules</SectionTitle>
              <SectionDescription>
                {filteredCards.length} modules available • Click on any card to get started
              </SectionDescription>
            </div>
            {favorites.length > 0 && (
              <FavoriteHint>
                {renderIcon('FiStar', { size: 14 })} Starred modules appear first
              </FavoriteHint>
            )}
          </ContentHeader>

          <CardsGrid
            as={motion.div}
            variants={CONTAINER_VARIANTS}
            initial="hidden"
            animate="visible"
          >
            <Suspense fallback={<LoadingGrid />}>
              <AnimatePresence mode="wait">
                {filteredCards
                  .sort((a, b) => {
                    const aFav = favorites.includes(a.id);
                    const bFav = favorites.includes(b.id);
                    if (aFav && !bFav) return -1;
                    if (!aFav && bFav) return 1;
                    return 0;
                  })
                  .map((card) => (
                    <motion.div
                      key={card.id}
                      layout
                      variants={CARD_VARIANTS}
                      whileHover={{ y: -4 }}
                      whileTap={{ scale: 0.98 }}
                      style={{ width: '100%' }}
                    >
                      <Card
                        onClick={() => handleCardClick(card)}
                        $color={card.color}
                      >
                        <CardHeader>
                          <IconWrapper $color={card.color}>
                            {renderIcon(card.icon, { size: 32 })}
                          </IconWrapper>
                          <CardActions>
                            <FavoriteButton
                              $isActive={favorites.includes(card.id)}
                              onClick={(e) => toggleFavorite(card.id, e)}
                              aria-label={favorites.includes(card.id) ? "Remove from favorites" : "Add to favorites"}
                            >
                              {renderIcon('FiStar', { 
                                size: 22,
                                fill: favorites.includes(card.id) ? '#f59e0b' : 'none'
                              })}
                            </FavoriteButton>
                            <CategoryBadge $color={card.color}>
                              {card.category}
                            </CategoryBadge>
                          </CardActions>
                        </CardHeader>
                        
                        <CardBody>
                          <CardTitle>{card.title}</CardTitle>
                          <CardDescription>{card.description}</CardDescription>
                        </CardBody>
                        
                        <CardFooter>
                          <StatsBadge>
                            {renderIcon('FiClock', { size: 16 })}
                            {card.stats}
                          </StatsBadge>
                          <ActionLink>
                            Open Module
                            {renderIcon('FiArrowRight', { size: 20 })}
                          </ActionLink>
                        </CardFooter>

                        {/* Decorative gradient overlay on hover */}
                        <CardOverlay $color={card.color} />
                      </Card>
                    </motion.div>
                  ))}
              </AnimatePresence>
            </Suspense>
          </CardsGrid>
          
          {filteredCards.length === 0 && (
            <EmptyState
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <EmptyIcon />
              <EmptyTitle>No modules found</EmptyTitle>
              <EmptyMessage>Try selecting a different category</EmptyMessage>
            </EmptyState>
          )}
        </MainContent>

        {/* Footer */}
        <Footer>
          <FooterContent>
            <FooterText>© {new Date().getFullYear()} Production Management System</FooterText>
            <FooterSubtext>Optimized for performance and reliability • v2.0.0</FooterSubtext>
          </FooterContent>
        </Footer>

        {/* Cancel Picker Modal */}
        <AnimatePresence>
          {showCancelPicker && (
            <ModalOverlay
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCancelPicker(false)}
            >
              <ModalContent
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                onClick={(e) => e.stopPropagation()}
              >
                <ModalHeader>
                  <ModalTitle>Cancel Order</ModalTitle>
                  <CloseModal onClick={() => setShowCancelPicker(false)}>
                    {renderIcon('FiX', { size: 20 })}
                  </CloseModal>
                </ModalHeader>
                
                <ModalBody>
                  <ModalDescription>
                    Select the type of order you want to cancel
                  </ModalDescription>
                  
                  <ChoiceGrid>
                    <ChoiceButton
                      onClick={() => handlePick('sale')}
                      whileHover={{ scale: 1.02, borderColor: '#6366f1' }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <ChoiceIcon $color="#6366f1">
                        {renderIcon('FiShoppingCart', { size: 24 })}
                      </ChoiceIcon>
                      <ChoiceContent>
                        <ChoiceTitle>Sales Order</ChoiceTitle>
                        <ChoiceDesc>Cancel customer-facing sales orders</ChoiceDesc>
                      </ChoiceContent>
                    </ChoiceButton>
                    
                    <ChoiceButton
                      onClick={() => handlePick('job')}
                      whileHover={{ scale: 1.02, borderColor: '#06b6d4' }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <ChoiceIcon $color="#06b6d4">
                        {renderIcon('FiLayers', { size: 24 })}
                      </ChoiceIcon>
                      <ChoiceContent>
                        <ChoiceTitle>Job Order</ChoiceTitle>
                        <ChoiceDesc>Cancel internal production job orders</ChoiceDesc>
                      </ChoiceContent>
                    </ChoiceButton>
                  </ChoiceGrid>
                </ModalBody>
              </ModalContent>
            </ModalOverlay>
          )}
        </AnimatePresence>
      </PageWrap>
    </>
  );
};

// Loading skeleton for cards
const LoadingGrid = () => (
  <>
    {[...Array(8)].map((_, i) => (
      <CardSkeleton key={i} />
    ))}
  </>
);

// Styled Components
const PageWrap = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
`;

const BackgroundGradient = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 500px;
  background: ${THEME.gradient};
  opacity: 0.05;
  z-index: -1;
`;

const BackgroundPattern = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: radial-gradient(circle at 25px 25px, ${THEME.primary}10 2px, transparent 2px);
  background-size: 50px 50px;
  z-index: -1;
  animation: ${float} 30s linear infinite;
`;

const Header = styled.header`
  background: ${THEME.gradient};
  color: white;
  padding: 2rem 1rem 3rem;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: -50%;
    right: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
    animation: ${pulse} 8s ease-in-out infinite;
  }
`;

const HeaderContent = styled.div`
  max-width: 1600px;
  margin: 0 auto;
  position: relative;
  z-index: 2;
`;

const TitleSection = styled.div`
  text-align: center;
  padding: 0 1rem 2rem;
`;

const TitleBadge = styled(motion.span)`
  display: inline-block;
  background: rgba(255, 255, 255, 0.15);
  padding: 0.5rem 1.25rem;
  border-radius: 30px;
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
`;

const MainTitle = styled(motion.h1)`
  font-size: clamp(2rem, 5vw, 3rem);
  font-weight: 800;
  margin: 0 0 1rem 0;
  line-height: 1.2;
  letter-spacing: -0.02em;
  text-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

const Subtitle = styled(motion.p)`
  font-size: 1.125rem;
  opacity: 0.9;
  max-width: 600px;
  margin: 0 auto;
  line-height: 1.6;
`;

const ControlsSection = styled(motion.div)`
  max-width: 1000px;
  margin: 0 auto;
  padding: 0 1rem;
`;

const CategoryFilters = styled.div`
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  justify-content: center;
`;

const CategoryButton = styled.button`
  background: ${props => props.$active ? 'white' : 'rgba(255, 255, 255, 0.15)'};
  color: ${props => props.$active ? THEME.primary : 'white'};
  border: 1px solid ${props => props.$active ? 'transparent' : 'rgba(255, 255, 255, 0.3)'};
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  &:hover {
    background: ${props => props.$active ? 'white' : 'rgba(255, 255, 255, 0.25)'};
    transform: translateY(-2px);
  }
`;

const CategoryCount = styled.span`
  background: ${props => props.$active ? `${THEME.primary}15` : 'rgba(255, 255, 255, 0.2)'};
  color: ${props => props.$active ? THEME.primary : 'white'};
  padding: 0.25rem 0.5rem;
  border-radius: 8px;
  font-size: 0.75rem;
`;

const MainContent = styled.main`
  flex: 1;
  max-width: 2200px;
  width: 100%;
  margin: 2rem auto 0;
  padding: 0 2rem 2rem;
  position: relative;
`;

const ContentHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
`;

const SectionTitle = styled.h2`
  font-size: 1.75rem;
  font-weight: 700;
  color: ${THEME.textPrimary};
  margin-bottom: 0.5rem;
`;

const SectionDescription = styled.p`
  color: ${THEME.textLight};
  font-size: 1rem;
`;

const FavoriteHint = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: ${THEME.warning}10;
  color: ${THEME.warning};
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;
  border: 1px solid ${THEME.warning}20;
`;

const CardsGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 2rem;
  width: 100%;
  
  @media (max-width: 1400px) {
    grid-template-columns: repeat(3, 1fr);
    gap: 1.75rem;
  }
  
  @media (max-width: 1100px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
  }
  
  @media (max-width: 700px) {
    grid-template-columns: 1fr;
    gap: 1.25rem;
  }
`;

const Card = styled.div`
  background: ${THEME.cardBackground};
  border-radius: 28px;
  padding: 2rem 1.75rem;
  box-shadow: ${THEME.shadow};
  border: 1px solid ${THEME.border};
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  height: 360px;
  width: 100%;
  position: relative;
  overflow: hidden;
  
  &:hover {
    box-shadow: ${THEME.hoverShadow};
    border-color: ${props => props.$color};
    transform: translateY(-6px);
  }

  @media (max-width: 1100px) {
    height: 340px;
    padding: 1.75rem 1.5rem;
  }
  
  @media (max-width: 700px) {
    height: 320px;
    padding: 1.5rem;
  }
`;

const CardOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: ${props => `linear-gradient(145deg, ${props.$color}08, transparent 70%)`};
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
  margin-bottom: 1.75rem;
`;

const IconWrapper = styled.div`
  width: 70px;
  height: 70px;
  border-radius: 20px;
  background: ${props => `${props.$color}15`};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => props.$color};
  
  svg {
    width: 34px;
    height: 34px;
  }
`;

const CardActions = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const FavoriteButton = styled.button`
  background: none;
  border: none;
  padding: 0.5rem;
  cursor: pointer;
  color: ${props => props.$isActive ? '#f59e0b' : THEME.textLight};
  border-radius: 8px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background: ${props => props.$isActive ? '#f59e0b20' : THEME.border};
    transform: scale(1.1);
  }
  
  svg {
    width: 24px;
    height: 24px;
  }
`;

const CategoryBadge = styled.span`
  font-size: 0.9rem;
  font-weight: 600;
  padding: 0.5rem 1rem;
  border-radius: 24px;
  background: ${props => `${props.$color}15`};
  color: ${props => props.$color};
  border: 1px solid ${props => `${props.$color}30`};
`;

const CardBody = styled.div`
  flex: 1;
  margin-bottom: 1.5rem;
`;

const CardTitle = styled.h3`
  font-size: 1.4rem;
  font-weight: 700;
  color: ${THEME.textPrimary};
  margin-bottom: 0.75rem;
  line-height: 1.3;
  
  @media (max-width: 700px) {
    font-size: 1.3rem;
  }
`;

const CardDescription = styled.p`
  font-size: 1rem;
  color: ${THEME.textLight};
  line-height: 1.5;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  
  @media (max-width: 700px) {
    font-size: 0.95rem;
    -webkit-line-clamp: 2;
  }
`;

const CardFooter = styled.div`
  border-top: 1px solid ${THEME.border};
  padding-top: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const StatsBadge = styled.span`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: ${THEME.background};
  border-radius: 24px;
  font-size: 0.9rem;
  color: ${THEME.textLight};
  border: 1px solid ${THEME.border};
  
  svg {
    width: 18px;
    height: 18px;
  }
`;

const ActionLink = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: ${THEME.primary};
  font-weight: 600;
  font-size: 1rem;
  transition: all 0.2s ease;
  
  ${Card}:hover & {
    gap: 0.75rem;
  }
  
  svg {
    width: 22px;
    height: 22px;
  }
`;

const EmptyState = styled(motion.div)`
  text-align: center;
  padding: 5rem 1rem;
  background: ${THEME.cardBackground};
  border-radius: 28px;
  border: 1px solid ${THEME.border};
`;

const EmptyIcon = styled.div`
  width: 80px;
  height: 80px;
  margin: 0 auto 2rem;
  background: ${THEME.border};
  border-radius: 50%;
  opacity: 0.5;
`;

const EmptyTitle = styled.h4`
  font-size: 1.5rem;
  font-weight: 600;
  color: ${THEME.textPrimary};
  margin-bottom: 0.75rem;
`;

const EmptyMessage = styled.p`
  font-size: 1rem;
  color: ${THEME.textLight};
  margin: 0;
`;

const Footer = styled.footer`
  background: ${THEME.cardBackground};
  border-top: 1px solid ${THEME.border};
  padding: 2.5rem 1rem;
  margin-top: 3rem;
`;

const FooterContent = styled.div`
  max-width: 1600px;
  margin: 0 auto;
  text-align: center;
`;

const FooterText = styled.div`
  font-weight: 600;
  color: ${THEME.textPrimary};
  margin-bottom: 0.5rem;
  font-size: 1.1rem;
`;

const FooterSubtext = styled.div`
  font-size: 0.95rem;
  color: ${THEME.textLight};
`;

// Modal Components
const ModalOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  z-index: 1000;
`;

const ModalContent = styled(motion.div)`
  background: ${THEME.cardBackground};
  border-radius: 28px;
  width: 100%;
  max-width: 450px;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.75rem;
  border-bottom: 1px solid ${THEME.border};
`;

const ModalTitle = styled.h3`
  font-size: 1.4rem;
  font-weight: 700;
  color: ${THEME.textPrimary};
  margin: 0;
`;

const CloseModal = styled.button`
  background: none;
  border: none;
  padding: 0.5rem;
  cursor: pointer;
  color: ${THEME.textLight};
  border-radius: 8px;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${THEME.border};
    color: ${THEME.textPrimary};
  }
`;

const ModalBody = styled.div`
  padding: 1.75rem;
`;

const ModalDescription = styled.p`
  color: ${THEME.textLight};
  margin-bottom: 2rem;
  font-size: 1rem;
`;

const ChoiceGrid = styled.div`
  display: grid;
  gap: 1.25rem;
`;

const ChoiceButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 1.25rem;
  background: ${THEME.cardBackground};
  border: 1px solid ${THEME.border};
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  
  &:hover {
    border-color: ${props => props.$color || THEME.primary};
    background: ${props => `${props.$color || THEME.primary}08`};
  }
`;

const ChoiceIcon = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: ${props => `${props.$color}15`};
  color: ${props => props.$color};
  display: flex;
  align-items: center;
  justify-content: center;
  
  svg {
    width: 28px;
    height: 28px;
  }
`;

const ChoiceContent = styled.div`
  flex: 1;
`;

const ChoiceTitle = styled.div`
  font-weight: 700;
  color: ${THEME.textPrimary};
  margin-bottom: 0.35rem;
  font-size: 1.1rem;
`;

const ChoiceDesc = styled.div`
  font-size: 0.95rem;
  color: ${THEME.textLight};
`;

// Loading Skeleton
const CardSkeleton = styled.div`
  background: ${THEME.cardBackground};
  border-radius: 28px;
  padding: 2rem 1.75rem;
  border: 1px solid ${THEME.border};
  height: 360px;
  width: 100%;
  animation: ${pulse} 1.5s ease-in-out infinite;
`;

export default React.memo(SalesDashboard);