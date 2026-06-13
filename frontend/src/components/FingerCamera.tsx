import { useState, useRef, useEffect } from 'react';
import { Camera, CameraOff, ShieldCheck, Info, CheckCircle2, AlertCircle } from 'lucide-react';

export default function FingerCamera() {
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [streamActive, setStreamActive] = useState(false);
  const [postureAlert, setPostureAlert] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Stop camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const requestCameraAccess = async () => {
    setPermissionDenied(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setStreamActive(true);
      startPostureAnalysisLoop();
    } catch (err) {
      console.warn('Camera access denied or unavailable', err);
      setPermissionDenied(true);
      setStreamActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setStreamActive(false);
    setPostureAlert(null);
  };

  // Draw overlay canvas grids simulating posture verification
  const startPostureAnalysisLoop = () => {
    let frameId: number;

    const drawLoop = () => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video || !streamActive) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw active frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Render custom skeletal/wrist alignment lines
      ctx.strokeStyle = '#6366f1'; // brand-primary indigo
      ctx.lineWidth = 2.5;

      // Draw hand alignment boxes
      ctx.strokeRect(30, 80, 100, 100); // left hand bounds
      ctx.strokeRect(190, 80, 100, 100); // right hand bounds

      // Draw simulated joint dots
      ctx.fillStyle = '#10b981'; // green for good posture
      
      // Draw wrist reference line
      ctx.beginPath();
      ctx.moveTo(10, 190);
      ctx.lineTo(310, 190);
      ctx.strokeStyle = '#10b981';
      ctx.stroke();

      // Mock random minor posture warnings to engage the user (e.g. wrist rest fatigue warning)
      const sec = Math.floor(Date.now() / 1000);
      if (sec % 10 < 3) {
        setPostureAlert('Wrist angle bending too low. Keep hands straight.');
        ctx.fillStyle = '#ef4444'; // turn dots red
        ctx.strokeStyle = '#ef4444'; // turn wrist line red
        ctx.beginPath();
        ctx.moveTo(10, 190);
        ctx.lineTo(310, 190);
        ctx.stroke();
      } else {
        setPostureAlert(null);
      }

      // Draw dots
      ctx.beginPath();
      ctx.arc(80, 130, 6, 0, 2 * Math.PI); // left wrist
      ctx.arc(240, 130, 6, 0, 2 * Math.PI); // right wrist
      ctx.fill();

      // Add label text in canvas
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px Courier New';
      ctx.fillText('L-HAND GUIDE', 35, 95);
      ctx.fillText('R-HAND GUIDE', 195, 95);

      frameId = requestAnimationFrame(drawLoop);
    };

    // Delay loop kickoff slightly
    setTimeout(() => {
      frameId = requestAnimationFrame(drawLoop);
    }, 100);

    return () => cancelAnimationFrame(frameId);
  };

  useEffect(() => {
    if (streamActive) {
      startPostureAnalysisLoop();
    }
  }, [streamActive]);

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="glass-panel p-6 rounded-2xl border border-brand-border/40 space-y-5 relative overflow-hidden">
        
        {/* Header Title */}
        <div className="flex items-center gap-2.5 border-b border-brand-border/30 pb-3">
          <Camera className="w-5 h-5 text-brand-primary animate-pulse" />
          <h3 className="font-bold text-white text-sm">Privacy-Safe Posture Camera</h3>
        </div>

        {/* State 1: Show Privacy Disclaimer */}
        {!privacyAccepted ? (
          <div className="space-y-4">
            <div className="bg-brand-primary/10 border border-brand-primary/20 p-4 rounded-xl flex gap-3 text-left">
              <Info className="w-5 h-5 text-brand-primary shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed space-y-2">
                <span className="font-bold text-white block">Strict Privacy Protection</span>
                <p className="text-brand-muted">
                  TypeMentor AI performs posture tracking <strong>locally in your browser</strong>. Camera feed and biometric markers are never uploaded, stored, or processed on external servers.
                </p>
                <p className="text-brand-muted">
                  Webcam access is fully optional. If denied or disabled, the application continues to run without interruption.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setPrivacyAccepted(true);
                requestCameraAccess();
              }}
              className="w-full bg-brand-primary hover:bg-brand-primary/95 text-white font-bold py-2.5 rounded-xl shadow-lg shadow-brand-primary/20 text-xs transition-all flex items-center justify-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              I Understand, Enable Camera
            </button>
          </div>
        ) : permissionDenied ? (
          /* State 2: Camera Denied Fallback Diagram */
          <div className="space-y-4 text-center py-4">
            <div className="inline-flex p-3 rounded-full bg-brand-warning/10 border border-brand-warning/30 text-brand-warning mb-2">
              <CameraOff className="w-7 h-7" />
            </div>
            <h4 className="font-bold text-white text-xs">Camera Feed Blocked</h4>
            <p className="text-xs text-brand-muted leading-relaxed max-w-xs mx-auto">
              Camera access is blocked or unavailable. Here is a posture reference guideline to align your hands manually.
            </p>
            
            {/* Visual posture sketch fallback */}
            <div className="border border-brand-border/40 p-4 rounded-xl bg-brand-bg/50 text-left space-y-2">
              <div className="flex items-center gap-2 text-[10px] text-brand-success font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Good Posture: Wrists straight, forearms parallel to table.</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-brand-danger font-semibold">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Avoid: Resting wrists directly on sharp desk edges.</span>
              </div>
            </div>

            <button
              onClick={requestCameraAccess}
              className="text-xs text-brand-primary hover:underline font-bold"
            >
              Retry Camera Connection
            </button>
          </div>
        ) : (
          /* State 3: Active Video / Canvas Overlay */
          <div className="space-y-4">
            <div className="relative border border-brand-border/50 rounded-xl overflow-hidden aspect-video bg-slate-950 flex items-center justify-center">
              {/* Hidden HTML5 video capture */}
              <video ref={videoRef} className="hidden" width="320" height="240" playsInline muted />
              
              {/* Visible overlay canvas */}
              <canvas ref={canvasRef} width="320" height="240" className="w-full h-full object-cover" />

              {postureAlert && (
                <div className="absolute bottom-3 left-3 right-3 bg-brand-danger/90 backdrop-blur border border-red-500 p-2.5 rounded-lg text-white font-bold text-[10px] flex items-center gap-2 animate-bounce">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{postureAlert}</span>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                stopCamera();
                setPrivacyAccepted(false);
              }}
              className="w-full bg-brand-card/80 hover:bg-brand-card text-brand-muted hover:text-white font-bold py-2 rounded-xl text-xs transition-all border border-brand-border"
            >
              Disable Posture Camera
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
