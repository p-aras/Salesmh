import React, { useRef, useEffect, useState } from 'react';

const CameraDialog = ({ onCapture, onClose }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [captured, setCaptured] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // default to rear camera
  const [stream, setStream] = useState(null);

  const startCamera = async (mode = 'environment') => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { exact: mode } }
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.warn(`Could not use '${mode}' camera. Falling back to default.`, err);
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
        setStream(fallbackStream);
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
        }
      } catch (fallbackErr) {
        console.error('Error accessing camera:', fallbackErr);
        alert('Unable to access camera. Please check permissions.');
        onClose();
      }
    }
  };

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [facingMode]);

  const toggleCamera = () => {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  const captureImage = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (canvas && video) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg');
      setCaptured(dataUrl);
    }
  };

  const confirmImage = () => {
    if (captured) {
      fetch(captured)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], `captured_${Date.now()}.jpg`, { type: 'image/jpeg' });
          onCapture(file, captured);
        });
    }
  };

  return (
    <div style={overlayStyle}>
      <div style={dialogStyle}>
        {!captured ? (
          <>
            <video ref={videoRef} autoPlay style={{ width: '100%', borderRadius: '10px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginTop: '10px' }}>
              <button onClick={captureImage} style={buttonStyle}>📸 Capture</button>
              <button onClick={toggleCamera} style={buttonStyle}>🔄 Switch</button>
            </div>
          </>
        ) : (
          <>
            <img src={captured} alt="Captured" style={{ width: '100%', borderRadius: '10px' }} />
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between' }}>
              <button onClick={() => setCaptured(null)} style={buttonStyle}>🔁 Retake</button>
              <button onClick={confirmImage} style={buttonStyle}>✅ Use Photo</button>
            </div>
          </>
        )}
        <button onClick={onClose} style={{ ...buttonStyle, background: '#eee', color: '#333', marginTop: 8 }}>❌ Cancel</button>
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
    </div>
  );
};

const overlayStyle = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 9999,
};

const dialogStyle = {
  backgroundColor: '#fff',
  padding: 20,
  borderRadius: 12,
  width: '90%',
  maxWidth: '400px',
  textAlign: 'center',
};

const buttonStyle = {
  padding: '10px 16px',
  fontSize: '16px',
  border: 'none',
  borderRadius: '8px',
  backgroundColor: '#6d28d9',
  color: '#fff',
  cursor: 'pointer',
  flex: 1,
};

export default CameraDialog;
