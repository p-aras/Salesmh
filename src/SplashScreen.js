import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SplashScreen = ({ onLoadingComplete }) => {
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  // Styles
  const styles = {
    container: {
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100vh",
      background: "linear-gradient(135deg, #1a2a6c 0%, #4a148c 100%)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 9999,
      color: "white",
      fontFamily: "'Poppins', sans-serif",
      overflow: "hidden",
    },
    content: {
      textAlign: "center",
      padding: "20px",
      maxWidth: "90%",
      position: "relative",
      zIndex: 2,
    },
    companyName: {
      fontSize: "clamp(28px, 7vw, 48px)",
      fontWeight: 700,
      marginBottom: "12px",
      letterSpacing: "1.5px",
      background: "linear-gradient(90deg, #ffffff 0%, #e0e0e0 100%)",
      WebkitBackgroundClip: "text",
      backgroundClip: "text",
      color: "transparent",
      textShadow: "0 2px 4px rgba(0,0,0,0.1)",
    },
    subtitle: {
      fontSize: "clamp(16px, 3.5vw, 20px)",
      opacity: 0.85,
      marginBottom: "40px",
      fontWeight: 300,
      letterSpacing: "0.5px",
    },
    progressContainer: {
      width: "80%",
      maxWidth: "350px",
      height: "8px",
      background: "rgba(255, 255, 255, 0.15)",
      borderRadius: "10px",
      margin: "0 auto 25px",
      overflow: "hidden",
      boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
    },
    progressBar: {
      height: "100%",
      background: "linear-gradient(90deg, #00c9ff 0%, #92fe9d 100%)",
      borderRadius: "10px",
      transition: "width 0.4s cubic-bezier(0.65, 0, 0.35, 1)",
      width: `${progress}%`,
      boxShadow: "0 0 15px rgba(0, 201, 255, 0.5)",
    },
    versionText: {
      fontSize: "12px",
      opacity: 0.6,
      marginTop: "30px",
      letterSpacing: "0.5px",
    },
    decorativeCircle: {
      position: "absolute",
      borderRadius: "50%",
      background: "radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 70%)",
      filter: "blur(1px)",
    },
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0, transition: { duration: 0.5 } }
  };

  const textVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { duration: 0.6, ease: "easeOut" }
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(() => {
            setIsVisible(false);
            setTimeout(() => onLoadingComplete(), 500);
          }, 800);
          return 100;
        }
        // Simulate realistic loading with variable increments
        const increment = Math.random() * 15 + 5;
        return Math.min(prev + increment, 100);
      });
    }, 300 + Math.random() * 200); // Variable timing for more natural feel

    return () => clearInterval(timer);
  }, [onLoadingComplete]);

  // Generate decorative circles
  const circles = Array.from({ length: 5 }).map((_, i) => ({
    size: Math.random() * 300 + 100,
    left: Math.random() * 100,
    top: Math.random() * 100,
    opacity: Math.random() * 0.1 + 0.05,
    delay: Math.random() * 0.5
  }));

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          style={styles.container}
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={containerVariants}
        >
          {/* Decorative background elements */}
          {circles.map((circle, index) => (
            <motion.div
              key={index}
              style={{
                ...styles.decorativeCircle,
                width: circle.size,
                height: circle.size,
                left: `${circle.left}%`,
                top: `${circle.top}%`,
                opacity: circle.opacity,
              }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: circle.day, duration: 1.5 }}
            />
          ))}

          <motion.div style={styles.content}>
            <motion.h1 
              style={styles.companyName}
              variants={textVariants}
              initial="hidden"
              animate="visible"
            >
              Estimate MH
            </motion.h1>
            
            <motion.p 
              style={styles.subtitle}
              variants={textVariants}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.1 }}
            >
              Elevating Sales Order Management
            </motion.p>

            <motion.div
              style={styles.progressContainer}
              variants={textVariants}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.2 }}
            >
              <motion.div 
                style={styles.progressBar}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4 }}
              />
            </motion.div>

            <motion.p 
              style={styles.versionText}
              variants={textVariants}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.3 }}
            >
              Version 1.0.0 • Loading {progress}%
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;