import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function AccessDenied() {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className="denied">
      <div className={`box ${isVisible ? 'visible' : ''}`}>
        <div className="icon-container">
          <svg className="shield-icon" viewBox="0 0 24 24">
            <path fill="currentColor" d="M12,1L3,5v6c0,5.55,3.84,10.74,9,12c5.16-1.26,9-6.45,9-12V5L12,1z M12,11.99h7c-0.53,4.12-3.28,7.79-7,8.94V12H5V6.3l7-3.11V11.99z"/>
            <path fill="currentColor" d="M12,11.99h7c-0.53,4.12-3.28,7.79-7,8.94V12H5V6.3l7-3.11V11.99z" className="denied-shield"/>
          </svg>
        </div>
        
        <h1>Access Denied</h1>
        <p>You don't have permission to view this page. Please contact your administrator if you believe this is an error.</p>

        <button 
          className="btn" 
          onClick={() => navigate("/dashboard", { replace: true })}
          onMouseOver={(e) => e.target.classList.add('hover')}
          onMouseOut={(e) => e.target.classList.remove('hover')}
        >
          Back to Dashboard
        </button>
      </div>

      <style>{`
        .denied {
          min-height: calc(100vh - 70px);
          display: grid;
          place-items: center;
          padding: 24px;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        .box {
          width: 100%;
          max-width: 520px;
          border: 1px solid rgba(255, 255, 255, 0.5);
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          box-shadow: 
            0 15px 35px rgba(50, 50, 93, 0.1),
            0 5px 15px rgba(0, 0, 0, 0.07);
          padding: 40px 32px;
          text-align: center;
          transform: translateY(20px);
          opacity: 0;
          transition: all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        
        .box.visible {
          transform: translateY(0);
          opacity: 1;
        }
        
        .icon-container {
          margin-bottom: 24px;
        }
        
        .shield-icon {
          width: 80px;
          height: 80px;
          color: #818cf8;
          filter: drop-shadow(0 5px 10px rgba(102, 126, 234, 0.2));
        }
        
        .denied-shield {
          color: #ef4444;
          transform-origin: center;
          animation: denyPulse 2s ease-in-out infinite;
        }
        
        h1 {
          margin: 0 0 12px;
          font-size: 28px;
          font-weight: 800;
          letter-spacing: -0.5px;
          color: #1f2937;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        p {
          margin: 0 0 28px;
          color: #6b7280;
          font-size: 16px;
          line-height: 1.6;
        }
        
        .btn {
          appearance: none;
          border: 0;
          cursor: pointer;
          padding: 14px 28px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 16px;
          color: #fff;
          background: linear-gradient(135deg, #667eea, #764ba2);
          box-shadow: 
            0 12px 24px rgba(102, 126, 234, 0.25),
            0 6px 12px rgba(102, 126, 234, 0.15);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        
        .btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.7s ease;
        }
        
        .btn:hover {
          filter: saturate(1.1);
          transform: translateY(-2px);
          box-shadow: 
            0 16px 32px rgba(102, 126, 234, 0.3),
            0 8px 16px rgba(102, 126, 234, 0.2);
        }
        
        .btn.hover::before {
          left: 100%;
        }
        
        .btn:active {
          transform: translateY(0);
          box-shadow: 
            0 8px 16px rgba(102, 126, 234, 0.25),
            0 4px 8px rgba(102, 126, 234, 0.15);
        }
        
        @keyframes denyPulse {
          0% { opacity: 0.8; }
          50% { opacity: 1; }
          100% { opacity: 0.8; }
        }
        
        @media (max-width: 640px) {
          .box {
            padding: 32px 24px;
          }
          
          h1 {
            font-size: 24px;
          }
          
          p {
            font-size: 15px;
          }
        }
      `}</style>
    </div>
  );
}