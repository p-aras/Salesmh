import React, { useMemo, useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { createGlobalStyle } from 'styled-components';
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
const FiSearch = lazy(() => import('react-icons/fi').then(mod => ({ default: mod.FiSearch })));
const FiStar = lazy(() => import('react-icons/fi').then(mod => ({ default: mod.FiStar })));
const FiX = lazy(() => import('react-icons/fi').then(mod => ({ default: mod.FiX })));
const FiShoppingCart = lazy(() => import('react-icons/fi').then(mod => ({ default: mod.FiShoppingCart })));
const FiLayers = lazy(() => import('react-icons/fi').then(mod => ({ default: mod.FiLayers })));
const FiBox = lazy(() => import('react-icons/fi').then(mod => ({ default: mod.FiBox })));
const FiPackage = lazy(() => import('react-icons/fi').then(mod => ({ default: mod.FiPackage })));
const FiTag = lazy(() => import('react-icons/fi').then(mod => ({ default: mod.FiTag })));
const FiGrid = lazy(() => import('react-icons/fi').then(mod => ({ default: mod.FiGrid })));

/** =========================
 * Enhanced Sales Dashboard (Optimized Performance)
 * ========================= */

// Theme as constants for better performance
const THEME = {
  primary: '#1e4291',
  primaryLight: '#132f5c',
  primaryDark: '#1d4ed8',
  secondary: '#06b6d4',
  accent: '#8b5cf6',
  background: '#f8fafc',
  cardBackground: '#ffffff',
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  border: '#e2e8f0',
  shadow: '0 4px 20px rgba(37, 99, 235, 0.08)',
  hoverShadow: '0 12px 32px rgba(37, 99, 235, 0.15)',
  gradient: 'linear-gradient(135deg, #2563eb 0%, #06b6d4 100%)',
};

// Pre-defined card data
const CARDS = [
  { id: 1,  icon: 'FiFileText', title: 'Sales Order Form', description: 'Create, edit and submit new sales orders', path: '/sales-order', color: '#2563eb', category: 'Orders' },
  { id: 2,  icon: 'FiList', title: 'Order Tracking', description: 'Monitor production status and view order info', path: '/sales-data', color: '#06b6d4', category: 'Orders' },
  { id: 3,  icon: 'FiGrid', title: 'All Orders', description: 'View complete list of all sales orders', path: '/all-order-details', color: '#8b5cf6', category: 'Orders' },
  { id: 4,  icon: 'FiSettings', title: 'Sample Design Form', description: 'Submit and manage design samples', path: '/sample-design-form', color: '#f59e0b', category: 'Production' },
  { id: 6,  icon: 'FiUsers', title: 'Issued Lot No.', description: 'View orders pending fabric issue resolution', path: '/pending-fabric-issues', color: '#f97316', category: 'Production' },
  { id: 7,  icon: 'FiClipboard', title: 'Cutting Job Order Form', description: 'Create job orders with fabric details', path: '/job-order-form', color: '#ec4899', category: 'Cutting' },
  { id: 8,  icon: 'FiList', title: 'All Cutting Job Orders', description: 'View and manage all created job orders', path: '/all-job-orders', color: '#14b8a6', category: 'Cutting' },
  { id: 9,  icon: 'FiScissors', title: 'Embroidery Challan', description: 'Create and manage embroidery challans', path: '/embroidery-challan', color: '#84cc16', category: 'Challan' },
  { id: 10, icon: 'FiPrinter', title: 'Printing Challan', description: 'Generate and track printing challans', path: '/printing-challan', color: '#06b6d4', category: 'Challan' },
  { id: 11, icon: 'FiScissors', title: 'Cutting Details Entry', description: 'Calculate and manage cutting budgets', path: '/cutting-budget', color: '#6366f1', category: 'Cutting' },
  { id: 12, icon: 'FiPackage', title: 'View Cutting Details', description: 'Access detailed cutting records', path: '/details', color: '#d946ef', category: 'Cutting' },
  { id: 13, icon: 'FiBox', title: 'Embroidery Pending Challan', description: 'Access detailed embroidery records', path: '/emb-pending-challan', color: '#f43f5e', category: 'Challan' },
  { id: 14, icon: 'FiPrinter', title: 'Printing Pending Challan', description: 'Access detailed printing records', path: '/printing-pending-challan', color: '#f97316', category: 'Challan' },
  { id: 15, icon: 'FiTag', title: 'SOP of Embroidery/Printing', description: 'Detailed SOP for better productivity', path: '/sop', color: '#ef4444', category: 'Production' },
  { id: 16, icon: 'FiX', title: 'Order Cancelled Form', description: 'Filling cancellation details', path: '/cancel-order', color: '#64748b', category: 'Production' },
  // { id: 17, icon: 'FiLayers', title: 'Issue to Stitching', description: 'Issue cut pieces to stitching', path: '/issue-to-stitching', color: '#3b82f6', category: 'Production' },
  // { id: 18, icon: 'FiClipboard', title: 'Generate Stitching Rate List', description: 'Build standardized stitching rate lists', path: '/stitching-rate-list', color: '#8b5cf6', category: 'Production' },
  // { id: 19, icon: 'FiTrendingUp', title: 'Cutting Stats Report', description: 'Analyze cutting throughput and utilization', path: '/cutting-stats-report', color: '#0ea5e9', category: 'Cutting' },
  // { id: 20, icon: 'FiUsers', title: 'Enter Karigar Details', description: 'Add and manage Karigar information', path: '/karigar-details', color: '#0f766e', category: 'Production' },
  // { id: 21, icon: 'FiUsers', title: 'Checking and Packing Order', description: 'Issue Lots on Checking and Packing', path: '/checking-packing', color: '#0f766e', category: 'Production' },
];

const CATEGORIES = ['All', 'Orders', 'Production', 'Cutting', 'Challan'];

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
  FiSearch,
  FiStar,
  FiX,
  FiShoppingCart,
  FiLayers,
  FiBox,
  FiPackage,
  FiTag,
  FiGrid,
};

// Motion variants as constants
const CONTAINER_VARIANTS = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
};

const CARD_VARIANTS = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.3 } },
};

// Load only essential icons initially
const essentialIcons = {
  FiSearch,
  FiX,
};

// Global styles with performance optimizations
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
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
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
    background: rgba(0, 0, 0, 0.05);
  }
  
  ::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
  }
  
  ::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.3);
  }
`;

// Main Component
const SalesDashboard = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState('All');
  const [showCancelPicker, setShowCancelPicker] = useState(false);
  const [loadedIcons, setLoadedIcons] = useState(essentialIcons);

  // Debounce search input
  const [debouncedQuery, setDebouncedQuery] = useState('');
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 150);
    
    return () => clearTimeout(timer);
  }, [query]);

  // Load icons on demand
  useEffect(() => {
    const loadIcons = async () => {
      const iconsToLoad = CARDS.map(card => card.icon).filter((icon, index, self) => 
        self.indexOf(icon) === index && !loadedIcons[icon]
      );
      
      for (const iconName of iconsToLoad) {
        try {
          const iconModule = await import(`react-icons/fi`);
          setLoadedIcons(prev => ({ ...prev, [iconName]: iconModule[iconName] }));
        } catch (error) {
          console.warn(`Failed to load icon ${iconName}:`, error);
        }
      }
    };
    
    loadIcons();
  }, []);

  // Escape key handler
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') setShowCancelPicker(false);
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  // Memoized filtered cards with performance optimization
  const filteredCards = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    
    return CARDS.filter((card) => {
      const matchesCat = activeCat === 'All' || card.category === activeCat;
      if (!matchesCat) return false;
      
      if (!q) return true;
      
      return (
        card.title.toLowerCase().includes(q) ||
        card.description.toLowerCase().includes(q) ||
        card.category.toLowerCase().includes(q)
      );
    });
  }, [debouncedQuery, activeCat]);

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

  // Render icon component
  const renderIcon = (iconName, props = {}) => {
    const IconComponent = loadedIcons[iconName];
    return IconComponent ? <IconComponent {...props} /> : <div style={{ width: 24, height: 24 }} />;
  };

  return (
    <>
      <GlobalStyle />
      <PageWrap>
        {/* Simplified Background for better performance */}
        <BackgroundGradient />
        
        {/* Header */}
        <Header>
          <HeaderContent>
            <TitleSection>
              <TitleBadge>Production Management System</TitleBadge>
              <MainTitle>Sales & Cutting Order Dashboard</MainTitle>
              <Subtitle>
                Streamline your production pipeline with real-time tracking and smart workflows.
              </Subtitle>
            </TitleSection>
          </HeaderContent>
        </Header>

        {/* Main Content */}
        <MainContent>
          <ContentHeader>
            <SectionTitle>Quick Access Modules</SectionTitle>
            <SectionDescription>Click on any module to get started</SectionDescription>
          </ContentHeader>

          <CardsGrid
            as={motion.div}
            variants={CONTAINER_VARIANTS}
            initial="hidden"
            animate="visible"
          >
            <Suspense fallback={<LoadingGrid />}>
              <AnimatePresence mode="wait">
                {filteredCards.map((card) => (
                  <motion.div
                    key={card.id}
                    layout
                    variants={CARD_VARIANTS}
                    whileHover={{ y: -4 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Card
                      onClick={() => handleCardClick(card)}
                      $color={card.color}
                    >
                      <CardHeader>
                        <IconWrapper $color={card.color}>
                          {renderIcon(card.icon, { size: 20 })}
                        </IconWrapper>
                        <CategoryLabel $color={card.color}>
                          {card.category}
                        </CategoryLabel>
                      </CardHeader>
                      
                      <CardBody>
                        <CardTitle>{card.title}</CardTitle>
                        <CardDescription>{card.description}</CardDescription>
                      </CardBody>
                      
                      <CardFooter>
                        <ActionLink>
                          Open Module {renderIcon('FiArrowRight', { size: 16 })}
                        </ActionLink>
                      </CardFooter>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </Suspense>
          </CardsGrid>
          
          {filteredCards.length === 0 && (
            <EmptyState>
              <EmptyIcon />
              <EmptyTitle>No modules found</EmptyTitle>
              <EmptyMessage>Try adjusting your search criteria</EmptyMessage>
            </EmptyState>
          )}
        </MainContent>

        <Footer>
          <FooterText>© {new Date().getFullYear()} Production Management System</FooterText>
          <FooterSubtext>Optimized for performance and reliability</FooterSubtext>
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
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <ModalHeader>
                  <ModalTitle>Select Order Type to Cancel</ModalTitle>
                  <CloseModal onClick={() => setShowCancelPicker(false)}>
                    {renderIcon('FiX', { size: 20 })}
                  </CloseModal>
                </ModalHeader>
                
                <ModalBody>
                  <ModalDescription>
                    Choose the type of order you want to cancel
                  </ModalDescription>
                  
                  <ChoiceGrid>
                    <ChoiceButton
                      onClick={() => handlePick('sale')}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      $color="#2563eb"
                    >
                      <ChoiceIcon>
                        {renderIcon('FiShoppingCart', { size: 24 })}
                      </ChoiceIcon>
                      <ChoiceContent>
                        <ChoiceTitle>Sales Order</ChoiceTitle>
                        <ChoiceDesc>Cancel customer-facing sales orders</ChoiceDesc>
                      </ChoiceContent>
                    </ChoiceButton>
                    
                    <ChoiceButton
                      onClick={() => handlePick('job')}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      $color="#06b6d4"
                    >
                      <ChoiceIcon>
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
    {[...Array(6)].map((_, i) => (
      <CardSkeleton key={i} />
    ))}
  </>
);

// Styled Components with performance optimizations
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
  height: 400px;
  background: ${THEME.gradient};
  z-index: -1;
  opacity: 0.1;
`;

const Header = styled.header`
  background: ${THEME.gradient};
  color: white;
  padding: 2rem 1rem 3rem;
  position: relative;
  overflow: hidden;
  
  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
  }
`;

const HeaderContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const TitleSection = styled.div`
  text-align: center;
  padding: 0 1rem;
`;

const TitleBadge = styled.span`
  display: inline-block;
  background: rgba(255, 255, 255, 0.15);
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: 1rem;
  backdrop-filter: blur(10px);
`;

const MainTitle = styled.h1`
  font-size: clamp(1.75rem, 4vw, 2.5rem);
  font-weight: 700;
  margin: 0 0 1rem 0;
  line-height: 1.2;
`;

const Subtitle = styled.p`
  font-size: 1.125rem;
  opacity: 0.9;
  max-width: 600px;
  margin: 0 auto;
  line-height: 1.5;
`;

const MainContent = styled.main`
  flex: 1;
  max-width: 1200px;
  width: 100%;
  margin: -2rem auto 0;
  padding: 0 1rem 2rem;
  position: relative;
`;

const ContentHeader = styled.div`
  margin-bottom: 2rem;
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  color: ${THEME.textPrimary};
  margin-bottom: 0.5rem;
`;

const SectionDescription = styled.p`
  color: ${THEME.textSecondary};
  font-size: 0.95rem;
`;

const CardsGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.25rem;
  margin-bottom: 2rem;
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  }
  
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.div`
  background: ${THEME.cardBackground};
  border-radius: 12px;
  padding: 1.25rem;
  box-shadow: ${THEME.shadow};
  border: 1px solid ${THEME.border};
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
  overflow: hidden;
  
  &:hover {
    box-shadow: ${THEME.hoverShadow};
    border-color: ${props => props.$color};
    transform: translateY(-2px);
  }
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: ${props => props.$color};
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
`;

const IconWrapper = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: ${props => `${props.$color}15`};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => props.$color};
`;

const CategoryLabel = styled.span`
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  background: ${props => `${props.$color}10`};
  color: ${props => props.$color};
`;

const CardBody = styled.div`
  flex: 1;
  margin-bottom: 1rem;
`;

const CardTitle = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  color: ${THEME.textPrimary};
  margin-bottom: 0.5rem;
  line-height: 1.3;
`;

const CardDescription = styled.p`
  font-size: 0.875rem;
  color: ${THEME.textSecondary};
  line-height: 1.5;
  margin: 0;
`;

const CardFooter = styled.div`
  border-top: 1px solid ${THEME.border};
  padding-top: 1rem;
`;

const ActionLink = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: ${THEME.primary};
  font-weight: 500;
  font-size: 0.875rem;
  transition: gap 0.2s ease;
  
  ${Card}:hover & {
    gap: 0.75rem;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: ${THEME.textSecondary};
`;

const EmptyIcon = styled.div`
  width: 48px;
  height: 48px;
  margin: 0 auto 1rem;
  background: ${THEME.border};
  border-radius: 50%;
  opacity: 0.5;
`;

const EmptyTitle = styled.h4`
  font-size: 1.125rem;
  font-weight: 600;
  color: ${THEME.textPrimary};
  margin-bottom: 0.5rem;
`;

const EmptyMessage = styled.p`
  font-size: 0.875rem;
  margin: 0;
`;

const Footer = styled.footer`
  background: ${THEME.cardBackground};
  border-top: 1px solid ${THEME.border};
  padding: 1.5rem 1rem;
  text-align: center;
`;

const FooterText = styled.div`
  font-weight: 600;
  color: ${THEME.textPrimary};
  margin-bottom: 0.25rem;
`;

const FooterSubtext = styled.div`
  font-size: 0.875rem;
  color: ${THEME.textSecondary};
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
  border-radius: 12px;
  width: 100%;
  max-width: 400px;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid ${THEME.border};
`;

const ModalTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${THEME.textPrimary};
  margin: 0;
`;

const CloseModal = styled.button`
  background: none;
  border: none;
  padding: 0.5rem;
  cursor: pointer;
  color: ${THEME.textSecondary};
  border-radius: 4px;
  transition: background 0.2s ease;
  
  &:hover {
    background: ${THEME.border};
  }
`;

const ModalBody = styled.div`
  padding: 1.5rem;
`;

const ModalDescription = styled.p`
  color: ${THEME.textSecondary};
  margin-bottom: 1.5rem;
  font-size: 0.95rem;
`;

const ChoiceGrid = styled.div`
  display: grid;
  gap: 1rem;
`;

const ChoiceButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: ${THEME.background};
  border: 1px solid ${THEME.border};
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  
  &:hover {
    border-color: ${props => props.$color};
    background: ${props => `${props.$color}08`};
  }
`;

const ChoiceIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 6px;
  background: ${props => `${props.$color}15`};
  color: ${props => props.$color};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ChoiceContent = styled.div`
  flex: 1;
`;

const ChoiceTitle = styled.div`
  font-weight: 600;
  color: ${THEME.textPrimary};
  margin-bottom: 0.25rem;
`;

const ChoiceDesc = styled.div`
  font-size: 0.875rem;
  color: ${THEME.textSecondary};
`;

// Loading Skeleton
const CardSkeleton = styled.div`
  background: ${THEME.cardBackground};
  border-radius: 12px;
  padding: 1.25rem;
  border: 1px solid ${THEME.border};
  height: 180px;
  animation: pulse 1.5s ease-in-out infinite;
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`;

export default React.memo(SalesDashboard);