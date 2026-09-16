import { useEffect, useRef, useState, type ReactNode } from 'react';
import './auth.css';

const VIDEO_SRC = '/media/IMG_0536.mp4';

interface AuthLayoutProps {
  route: string;
  children: ReactNode;
}

function AuthLayout({ route, children }: AuthLayoutProps) {
  const [videoState, setVideoState] = useState({ attempt: 0, failed: false });
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const handleVideoError = () => {
    setVideoState((prev) =>
      prev.attempt < 2 ? { attempt: prev.attempt + 1, failed: false } : { ...prev, failed: true },
    );
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const tryPlay = () => {
      if (!document.hidden) video.play().catch(() => { /* first frame remains visible */ });
    };
    tryPlay();
    document.addEventListener('visibilitychange', tryPlay);
    return () => document.removeEventListener('visibilitychange', tryPlay);
  }, [videoState]);

  const handleMouseMove = (e: React.MouseEvent) => {
    // Parallax max 3px movement
    const x = (e.clientX / window.innerWidth) * 2 - 1;
    const y = (e.clientY / window.innerHeight) * 2 - 1;
    setOffset({ x: x * 3, y: y * 3 });
  };

  return (
    <div className="auth-page" onMouseMove={handleMouseMove}>
      <div className="auth-visual-bg">
        {!videoState.failed && (
          <video
            key={videoState.attempt}
            ref={videoRef}
            className="auth-video"
            src={VIDEO_SRC}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            tabIndex={-1}
            disablePictureInPicture
            onError={handleVideoError}
          />
        )}
      </div>

      <div className="auth-panel-container">
        <div 
          className="auth-panel-parallax"
          style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
        >
          <div className="auth-panel-idle">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthLayout;
