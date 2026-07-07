import { useState, useEffect, useRef } from 'react';
import SEOMeta from '../components/SEOMeta';
import { ACADEMY_LESSONS, AcademyLesson } from '../utils/academyLessons';
import { showPrToast } from '../utils/toastHelper';
import { soundEngine } from '../utils/soundEngine';
import { useAuthStore } from '../store/AuthStore';
import { saveLastActivity, logResumeAnalytics } from '../utils/ResumeTracker';
import { jsPDF } from 'jspdf';
import { useAICoachPulse, AICoachPulseCard } from '../utils/aiCoachPulse';
import { getStorageKey, getApiUrl } from '../utils/api';
import {
  CheckCircle2, Lock,
  ChevronRight, RefreshCw, Star, Info, Award, Download, X, Sparkles, Timer, Zap, AlertTriangle
} from 'lucide-react';

const FINGER_COLORS: Record<string, { border: string; text: string; bg: string; activeBg: string }> = {
  'Left Pinky': { border: 'border-rose-500/60', text: 'text-rose-400', bg: 'bg-rose-950/15', activeBg: 'bg-rose-500 text-slate-950 border-rose-400' },
  'Left Ring': { border: 'border-orange-500/60', text: 'text-orange-400', bg: 'bg-orange-950/15', activeBg: 'bg-orange-500 text-slate-950 border-orange-400' },
  'Left Middle': { border: 'border-amber-500/60', text: 'text-amber-400', bg: 'bg-amber-950/15', activeBg: 'bg-amber-500 text-slate-950 border-amber-400' },
  'Left Index': { border: 'border-emerald-500/60', text: 'text-emerald-400', bg: 'bg-emerald-950/15', activeBg: 'bg-emerald-500 text-slate-950 border-emerald-400' },
  'Thumb': { border: 'border-slate-500/60', text: 'text-slate-400', bg: 'bg-slate-800/15', activeBg: 'bg-slate-400 text-slate-950 border-slate-300' },
  'Right Index': { border: 'border-blue-500/60', text: 'text-blue-400', bg: 'bg-blue-950/15', activeBg: 'bg-blue-500 text-slate-950 border-blue-400' },
  'Right Middle': { border: 'border-indigo-500/60', text: 'text-indigo-400', bg: 'bg-indigo-950/15', activeBg: 'bg-indigo-500 text-slate-950 border-indigo-400' },
  'Right Ring': { border: 'border-purple-500/60', text: 'text-purple-400', bg: 'bg-purple-950/15', activeBg: 'bg-purple-500 text-slate-950 border-purple-400' },
  'Right Pinky': { border: 'border-fuchsia-500/60', text: 'text-fuchsia-400', bg: 'bg-fuchsia-950/15', activeBg: 'bg-fuchsia-500 text-slate-950 border-fuchsia-400' }
};

const KEY_TO_FINGER: Record<string, string> = {
  '1': 'Left Pinky', 'Q': 'Left Pinky', 'A': 'Left Pinky', 'Z': 'Left Pinky',
  '2': 'Left Ring', 'W': 'Left Ring', 'S': 'Left Ring', 'X': 'Left Ring',
  '3': 'Left Middle', 'E': 'Left Middle', 'D': 'Left Middle', 'C': 'Left Middle',
  '4': 'Left Index', 'R': 'Left Index', 'F': 'Left Index', 'V': 'Left Index',
  '5': 'Left Index', 'T': 'Left Index', 'G': 'Left Index', 'B': 'Left Index',
  ' ': 'Thumb',
  '6': 'Right Index', 'Y': 'Right Index', 'H': 'Right Index', 'N': 'Right Index',
  '7': 'Right Index', 'U': 'Right Index', 'J': 'Right Index', 'M': 'Right Index',
  '8': 'Right Middle', 'I': 'Right Middle', 'K': 'Right Middle', ',': 'Right Middle',
  '9': 'Right Ring', 'O': 'Right Ring', 'L': 'Right Ring', '.': 'Right Ring',
  '0': 'Right Pinky', '-': 'Right Pinky', '=': 'Right Pinky', 'P': 'Right Pinky',
  '[': 'Right Pinky', ']': 'Right Pinky', ';': 'Right Pinky', "'": 'Right Pinky',
  '/': 'Right Pinky'
};

const KEYBOARD_ROWS = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='],
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'"],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/']
];

export default function TypingAcademy() {
  const [activeTab, setActiveTab] = useState<'beginner' | 'intermediate' | 'test'>('beginner');
  const [completedLessons, setCompletedLessons] = useState<number[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<AcademyLesson | null>(null);

  // Lesson Play States
  const [typedText, setTypedText] = useState<string>('');
  const [isStarted, setIsStarted] = useState<boolean>(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [errors, setErrors] = useState<number>(0);
  const [finalResult, setFinalResult] = useState<{ wpm: number; accuracy: number; errors: number } | null>(null);

  // Live telemetry logs for AI Coach Pulse and Backspace Awareness
  const [typedCharsLog, setTypedCharsLog] = useState<Array<{ expected: string; actual: string; isMistake: boolean; timestamp: number }>>([]);
  const [backspacesLog, setBackspacesLog] = useState<Array<{ timestamp: number; isAfterMistake: boolean }>>([]);

  // Assessment Test States
  const [testText, setTestText] = useState<string>('');
  const [testTyped, setTestTyped] = useState<string>('');
  const [testStarted, setTestStarted] = useState<boolean>(false);
  const [testStart, setTestStart] = useState<number | null>(null);
  const [testEnd, setTestEnd] = useState<number | null>(null);
  const [testErrors, setTestErrors] = useState<number>(0);
  const [recommendedLevel, setRecommendedLevel] = useState<string | null>(null);

  // Celebration Modal States
  const [showCelebration, setShowCelebration] = useState<boolean>(false);
  const [celebrationCourse, setCelebrationCourse] = useState<'beginner' | 'intermediate' | null>(null);
  const [celebrationStats, setCelebrationStats] = useState<{ avgWpm: number; avgAccuracy: number; lessonsCompleted: number; certId: string } | null>(null);

  // Inactivity / Pause states
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [pauseTime, setPauseTime] = useState<number | null>(null);

  // ── Power-Up State ───────────────────────────────────────────────────
  // How many consecutive fails on current lesson
  const [lessonFailCount, setLessonFailCount] = useState<number>(0);
  // Whether the Power-Up offer modal is visible
  const [showPowerUpOffer, setShowPowerUpOffer] = useState<boolean>(false);
  // Whether the Shady Bribe modal is visible
  const [showBribeOffer, setShowBribeOffer] = useState<boolean>(false);
  // Active power-up: temporarily reduced minWpm for 1 round only
  const [activePowerUp, setActivePowerUp] = useState<{ reducedMinWpm: number; xpCost: number } | null>(null);
  // Animating purchase pop (achievement burst)
  const [powerUpActivated, setPowerUpActivated] = useState<boolean>(false);

  // AI Coach Pulse integration
  const { pulseMessage, processPulse, clearPulse, resetSessionState } = useAICoachPulse();

  const { user, fetchProfile } = useAuthStore();
  const userName = user?.name || 'TypeMentor Student';

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const testInputRef = useRef<HTMLTextAreaElement>(null);

  // Load progress from localStorage dynamically based on active user context
  useEffect(() => {
    const saved = localStorage.getItem(getStorageKey('academy_completed_lessons', user?.id));
    if (saved) {
      setCompletedLessons(JSON.parse(saved));
    } else {
      setCompletedLessons([]);
    }
  }, [user?.id]);

  // Inactivity auto-pause loop for Academy
  useEffect(() => {
    const isAcademyActive = (startTime !== null && endTime === null) || (testStart !== null && testEnd === null);
    if (!isAcademyActive || isPaused) return;

    let idleTimer: NodeJS.Timeout;

    const resetIdleTimer = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        setIsPaused(true);
        setPauseTime(Date.now());
      }, 10000); // 10s idle threshold
    };

    const handleWindowBlur = () => {
      setIsPaused(true);
      setPauseTime(Date.now());
    };

    const activityEvents = ['keydown', 'mousedown', 'mousemove', 'touchstart'];
    activityEvents.forEach(evt => window.addEventListener(evt, resetIdleTimer));
    window.addEventListener('blur', handleWindowBlur);

    resetIdleTimer();

    return () => {
      clearTimeout(idleTimer);
      activityEvents.forEach(evt => window.removeEventListener(evt, resetIdleTimer));
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [startTime, endTime, testStart, testEnd, isPaused]);

  const handleResume = () => {
    if (pauseTime) {
      const pausedDuration = Date.now() - pauseTime;
      if (startTime && !endTime) {
        setStartTime(prev => prev ? prev + pausedDuration : null);
      }
      if (testStart && !testEnd) {
        setTestStart(prev => prev ? prev + pausedDuration : null);
      }
    }
    setPauseTime(null);
    setIsPaused(false);
    
    // Focus appropriate input field
    setTimeout(() => {
      if (startTime && !endTime) {
        inputRef.current?.focus();
      } else if (testStart && !testEnd) {
        testInputRef.current?.focus();
      }
    }, 50);
  };

  // Listen for smart resume events or window variables to launch lesson
  useEffect(() => {
    const handleResumeEvent = (e: any) => {
      const lessonId = e.detail?.lessonId;
      if (lessonId) {
        const lesson = ACADEMY_LESSONS.find(l => String(l.id) === String(lessonId));
        if (lesson) {
          startLesson(lesson);
        }
      }
    };

    window.addEventListener('typementor_resume_lesson', handleResumeEvent);

    const initialResumeId = (window as any).__typementor_resume_lesson_id;
    if (initialResumeId) {
      const lesson = ACADEMY_LESSONS.find(l => String(l.id) === String(initialResumeId));
      if (lesson) {
        startLesson(lesson);
      }
      (window as any).__typementor_resume_lesson_id = null;
    }

    return () => {
      window.removeEventListener('typementor_resume_lesson', handleResumeEvent);
    };
  }, []);

  // Completion criteria evaluation
  const isBeginnerCompleted = completedLessons.includes(30) || Array.from({ length: 30 }, (_, i) => i + 1).every(id => completedLessons.includes(id));
  const isIntermediateUnlocked = isBeginnerCompleted || completedLessons.some(id => id >= 31) || localStorage.getItem(getStorageKey('academy_intermediate_unlocked', user?.id)) === 'true';
  const isIntermediateCompleted = completedLessons.includes(50) || Array.from({ length: 20 }, (_, i) => i + 31).every(id => completedLessons.includes(id));
  const isTestUnlocked = isIntermediateCompleted || completedLessons.some(id => id >= 51) || localStorage.getItem(getStorageKey('academy_test_unlocked', user?.id)) === 'true';

  // Make sure Intermediate unlock rule persists
  useEffect(() => {
    if (isBeginnerCompleted) {
      localStorage.setItem(getStorageKey('academy_intermediate_unlocked', user?.id), 'true');
    }
  }, [isBeginnerCompleted, user?.id]);

  // Make sure Test unlock rule persists
  useEffect(() => {
    if (isIntermediateCompleted) {
      localStorage.setItem(getStorageKey('academy_test_unlocked', user?.id), 'true');
    }
  }, [isIntermediateCompleted, user?.id]);

  // Listen for global keydown events to support pressing Enter to advance/retry lessons
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showCelebration) {
        if (e.key === 'Enter') {
          e.preventDefault();
          setShowCelebration(false);
        }
        return;
      }

      if (endTime && selectedLesson && finalResult) {
        if (e.key === 'Enter') {
          e.preventDefault();
          const isSuccess = finalResult.wpm >= selectedLesson.minWpm && finalResult.accuracy >= selectedLesson.minAccuracy;
          if (isSuccess) {
            const nextId = selectedLesson.id + 1;
            const next = ACADEMY_LESSONS.find(l => l.id === nextId);
            if (next) {
              startLesson(next);
            } else {
              setSelectedLesson(null);
            }
          } else {
            // Restart the same lesson
            startLesson(selectedLesson);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [endTime, selectedLesson, finalResult, showCelebration, completedLessons]);

  // Reset pulse stats on lesson change
  useEffect(() => {
    resetSessionState();
  }, [selectedLesson]);

  // Reset fail counter and power-up when switching to a DIFFERENT lesson
  const prevLessonIdRef = useRef<number | null>(null);
  useEffect(() => {
    if (!selectedLesson) return;
    if (prevLessonIdRef.current !== null && prevLessonIdRef.current !== selectedLesson.id) {
      setLessonFailCount(0);
      setActivePowerUp(null);
      setShowPowerUpOffer(false);
      setShowBribeOffer(false);
      window.speechSynthesis.cancel();
    }
    prevLessonIdRef.current = selectedLesson.id;
  }, [selectedLesson?.id]);

  // Track abandoned lessons when navigating away from an active lesson
  useEffect(() => {
    return () => {
      if (selectedLesson && isStarted && endTime === null) {
        logResumeAnalytics('abandoned');
      }
    };
  }, [selectedLesson, isStarted, endTime]);

  // Feed metrics to coaching processor reactively
  useEffect(() => {
    if (endTime !== null || !isStarted || !selectedLesson) return;

    const duration = startTime ? (Date.now() - startTime) / 60000 : 0;
    const currentWpm = duration > 0 ? Math.round((typedText.split(' ').length) / duration) : 0;
    const currentAcc = typedText.length > 0 ? Math.round(((typedText.length - errors) / typedText.length) * 100) : 100;

    processPulse({
      typedChars: typedCharsLog,
      backspaces: backspacesLog,
      wpm: currentWpm,
      accuracy: currentAcc,
      isCompleted: endTime !== null
    });
  }, [typedCharsLog.length, backspacesLog.length, endTime, isStarted]);

  const completeLesson = (id: number, wpm: number, accuracy: number) => {
    if (window && (window as any).__typementor_resumed) {
      logResumeAnalytics('completed');
      (window as any).__typementor_resumed = false;
    }
    const updated = [...new Set([...completedLessons, id])];
    setCompletedLessons(updated);
    localStorage.setItem(getStorageKey('academy_completed_lessons', user?.id), JSON.stringify(updated));

    // Save lesson results
    const savedResultsStr = localStorage.getItem(getStorageKey('academy_lesson_results', user?.id));
    const savedResults = savedResultsStr ? JSON.parse(savedResultsStr) : {};
    savedResults[id] = { wpm, accuracy, date: new Date().toISOString() };
    localStorage.setItem(getStorageKey('academy_lesson_results', user?.id), JSON.stringify(savedResults));

    // Sync to database if user is authenticated
    const token = localStorage.getItem('typementor_token');
    if (token && user?.id) {
      fetch(getApiUrl('/api/auth/profile/academy'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          progress: {
            completed: updated,
            results: savedResults,
          },
        }),
      }).catch((err) => {
        console.error('Failed to sync completed lesson to database:', err);
      });
    }

    // Calculate completions on the updated set to unlock next levels immediately
    const nextIsBeginnerCompleted = id === 30 || Array.from({ length: 30 }, (_, i) => i + 1).every(item => updated.includes(item));
    if (nextIsBeginnerCompleted) {
      localStorage.setItem(getStorageKey('academy_intermediate_unlocked', user?.id), 'true');
    }

    const nextIsIntermediateCompleted = id === 50 || Array.from({ length: 20 }, (_, i) => i + 31).every(item => updated.includes(item));
    if (nextIsIntermediateCompleted) {
      localStorage.setItem(getStorageKey('academy_test_unlocked', user?.id), 'true');
    }

    showPrToast(`🎉 Lesson ${id} Completed!`);

    // Trigger celebration only for milestones
    if (id === 30 && nextIsBeginnerCompleted) {
      triggerMilestoneCelebration('beginner', wpm, accuracy);
    } else if (id === 50 && nextIsIntermediateCompleted) {
      triggerMilestoneCelebration('intermediate', wpm, accuracy);
    }
  };

  const triggerMilestoneCelebration = (course: 'beginner' | 'intermediate', finalWpm: number, finalAcc: number) => {
    const stats = getCourseStats(course, finalWpm, finalAcc);
    const certId = `TM-${course === 'beginner' ? 'BEG' : 'INT'}-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    setCelebrationCourse(course);
    setCelebrationStats({ ...stats, certId });
    setShowCelebration(true);
  };

  const getCourseStats = (type: 'beginner' | 'intermediate', fallbackWpm: number, fallbackAcc: number) => {
    const savedResultsStr = localStorage.getItem(getStorageKey('academy_lesson_results', user?.id));
    const savedResults = savedResultsStr ? JSON.parse(savedResultsStr) : {};
    
    const ids = type === 'beginner' 
      ? Array.from({ length: 30 }, (_, i) => i + 1)
      : Array.from({ length: 20 }, (_, i) => i + 31);
      
    let totalWpm = 0;
    let totalAcc = 0;
    let count = 0;
    
    ids.forEach(id => {
      if (savedResults[id]) {
        totalWpm += savedResults[id].wpm;
        totalAcc += savedResults[id].accuracy;
        count++;
      }
    });
    
    if (count >= 5) {
      return {
        avgWpm: Math.round(totalWpm / count),
        avgAccuracy: Math.round(totalAcc / count),
        lessonsCompleted: count
      };
    } else {
      return {
        avgWpm: fallbackWpm,
        avgAccuracy: fallbackAcc,
        lessonsCompleted: type === 'beginner' ? 30 : 20
      };
    }
  };

  const handleDownloadPDF = () => {
    if (!celebrationCourse || !celebrationStats) return;
    const type = celebrationCourse;
    const stats = celebrationStats;

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const width = 297;
    const height = 210;

    // Dark-blue / slate premium background
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, width, height, 'F');

    // Inner gold border
    doc.setDrawColor(234, 179, 8);
    doc.setLineWidth(1.5);
    doc.rect(8, 8, width - 16, height - 16, 'D');

    // Thin inner gold border
    doc.setDrawColor(234, 179, 8);
    doc.setLineWidth(0.5);
    doc.rect(10, 10, width - 20, height - 20, 'D');

    // Branding
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('TYPEMENTOR AI', width / 2, 25, { align: 'center' });

    doc.setTextColor(148, 163, 184);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('ADAPTIVE TYPING ACADEMY', width / 2, 30, { align: 'center' });

    // Certificate Title
    doc.setTextColor(234, 179, 8);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(28);
    doc.text('CERTIFICATE OF COMPLETION', width / 2, 55, { align: 'center' });

    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(12);
    doc.text('This is proudly presented to', width / 2, 70, { align: 'center' });

    // Student Name
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(24);
    doc.text(userName, width / 2, 85, { align: 'center' });

    // Divider
    doc.setDrawColor(71, 85, 105);
    doc.setLineWidth(0.5);
    doc.line(60, 92, width - 60, 92);

    // Description
    doc.setTextColor(148, 163, 184);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(11);
    const courseName = type === 'beginner' ? 'Beginner Touch Typing Course' : 'Intermediate Touch Typing Course';
    doc.text(`For successfully mastering the ${courseName}, demonstrating proper key positioning,`, width / 2, 103, { align: 'center' });
    doc.text('finger coordination, and touch typing muscle memory.', width / 2, 109, { align: 'center' });

    // Statistics Panels
    doc.setFillColor(30, 41, 59);
    doc.roundedRect(40, 122, 65, 30, 3, 3, 'F');
    doc.setTextColor(234, 179, 8);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(`${stats.avgWpm} WPM`, 72.5, 137, { align: 'center' });
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(8);
    doc.text('AVERAGE SPEED', 72.5, 147, { align: 'center' });

    doc.setFillColor(30, 41, 59);
    doc.roundedRect(115, 122, 65, 30, 3, 3, 'F');
    doc.setTextColor(34, 197, 94);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(`${stats.avgAccuracy}%`, 147.5, 137, { align: 'center' });
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(8);
    doc.text('AVERAGE ACCURACY', 147.5, 147, { align: 'center' });

    doc.setFillColor(30, 41, 59);
    doc.roundedRect(190, 122, 65, 30, 3, 3, 'F');
    doc.setTextColor(59, 130, 246);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(`${stats.lessonsCompleted}`, 222.5, 137, { align: 'center' });
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(8);
    doc.text('LESSONS COMPLETED', 222.5, 147, { align: 'center' });

    // Footer Info
    const completionDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.setTextColor(148, 163, 184);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Issued: ${completionDate}`, 40, 175);
    doc.text(`Certificate ID: ${stats.certId}`, 40, 182);

    doc.setTextColor(234, 179, 8);
    doc.setFont('Helvetica', 'bold');
    doc.text('TypeMentor AI Verified', width - 95, 175);
    doc.setTextColor(148, 163, 184);
    doc.setFont('Helvetica', 'normal');
    doc.text('Best wishes for your typing journey', width - 95, 182);

    doc.save(`TypeMentor_Certificate_${type}.pdf`);
  };

  // ── Typing Mechanics ──────────────────────────────────────────────────────
  const startLesson = (lesson: AcademyLesson) => {
    if (lesson.id <= 30) {
      setActiveTab('beginner');
    } else if (lesson.id <= 50) {
      setActiveTab('intermediate');
    } else {
      setActiveTab('test');
    }
    setSelectedLesson(lesson);
    saveLastActivity({
      type: 'academy',
      lessonId: String(lesson.id),
      title: lesson.id > 30 ? `Intermediate Lesson ${lesson.id - 30}` : `Beginner Lesson ${lesson.id}`
    });
    setTypedText('');
    setIsStarted(false);
    setStartTime(null);
    setEndTime(null);
    setErrors(0);
    setTypedCharsLog([]);
    setBackspacesLog([]);
    setFinalResult(null);
    setIsPaused(false);
    setPauseTime(null);
    // Reset power-up offer state (don't reset activePowerUp or failCount here
    // — those are managed by the lesson change detector below)
    setShowPowerUpOffer(false);
    setShowBribeOffer(false);
    window.speechSynthesis.cancel();
    setTimeout(() => inputRef.current?.focus(), 150);
  };

  const focusTypingInput = () => {
    inputRef.current?.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (endTime !== null || isPaused) return;
    const value = e.target.value;
    if (!selectedLesson) return;

    if (!isStarted) {
      setIsStarted(true);
      setStartTime(Date.now());
    }

    // Capture mistakes only on additions
    if (value.length > typedText.length) {
      const lastChar = value[value.length - 1];
      const expectedChar = selectedLesson.text[value.length - 1];
      const isMistake = lastChar !== expectedChar;

      if (isMistake) {
        setErrors(prev => prev + 1);
      }

      setTypedCharsLog(prev => [...prev, {
        expected: expectedChar || '',
        actual: lastChar || '',
        isMistake,
        timestamp: Date.now()
      }]);

      if (lastChar === ' ') {
        soundEngine.play('space');
      } else if (lastChar === '\n') {
        soundEngine.play('enter');
      } else {
        soundEngine.play('key');
      }
    } else if (value.length < typedText.length) {
      soundEngine.play('backspace');
      // Capture popped key isMistake
      const lastLogged = typedCharsLog[typedCharsLog.length - 1];
      const poppedIsMistake = lastLogged ? lastLogged.isMistake : false;
      setBackspacesLog(prev => [...prev, {
        timestamp: Date.now(),
        isAfterMistake: poppedIsMistake
      }]);
      setTypedCharsLog(prev => prev.slice(0, -1));
    }

    setTypedText(value);

    // End condition
    if (value.length === selectedLesson.text.length) {
      const completionTime = Date.now();
      setEndTime(completionTime);
      const duration = (completionTime - (startTime || completionTime)) / 60000;
      const wpm = duration > 0 ? Math.round((selectedLesson.text.split(' ').length) / duration) : 0;
      const acc = Math.round(((selectedLesson.text.length - errors) / selectedLesson.text.length) * 100);

      setFinalResult(Object.freeze({
        wpm,
        accuracy: acc,
        errors
      }));

      // Use reduced minWpm if power-up is active for this round
      const effectiveMinWpm = activePowerUp ? activePowerUp.reducedMinWpm : selectedLesson.minWpm;

      if (wpm >= effectiveMinWpm && acc >= selectedLesson.minAccuracy) {
        // Success: clear power-up and fail counter
        setActivePowerUp(null);
        setLessonFailCount(0);
        completeLesson(selectedLesson.id, wpm, acc);
      } else {
        // Failure: increment fail counter, clear any used power-up
        setActivePowerUp(null);
        const newFails = lessonFailCount + 1;
        setLessonFailCount(newFails);
        const failMsg = activePowerUp
          ? `⚠️ Power-Up attempt failed. Need ${effectiveMinWpm} WPM & ${selectedLesson.minAccuracy}% Accuracy.`
          : `⚠️ Lesson failed. Need ${selectedLesson.minWpm} WPM & ${selectedLesson.minAccuracy}% Accuracy.`;
        showPrToast(failMsg);
        // Offer Bribe after 3 consecutive fails (if no power-up active)
        if (newFails === 3 && !activePowerUp && user) {
          setTimeout(() => {
            setShowBribeOffer(true);
            const msg = "Psst... You look stuck. I can forge your academy certificate for this level... but it will cost you 70 percent of your total XP.";
            const utterance = new SpeechSynthesisUtterance(msg);
            utterance.pitch = 0.5; // Deep/shady voice
            utterance.rate = 0.9;
            window.speechSynthesis.speak(utterance);
          }, 800);
        }
        // Offer power-up after 5 consecutive fails (and user hasn't used a power-up this round)
        if (newFails >= 5 && !activePowerUp && user) {
          setTimeout(() => setShowPowerUpOffer(true), 800);
        }
      }
    }
  };

  // ── Power-Up Helpers ───────────────────────────────────────────────
  // XP cost formula: each WPM point reduced costs 15 XP, minimum 30 XP
  const calcPowerUpCost = (minWpm: number): { reducedMinWpm: number; xpCost: number } => {
    // Reduce by 20% (floor to nearest integer), minimum floor is 15 WPM
    const reduction = Math.max(1, Math.floor(minWpm * 0.20));
    const reducedMinWpm = Math.max(15, minWpm - reduction);
    const xpCost = Math.max(30, reduction * 15);
    return { reducedMinWpm, xpCost };
  };

  const handleActivatePowerUp = async () => {
    if (!selectedLesson || !user) return;
    const { reducedMinWpm, xpCost } = calcPowerUpCost(selectedLesson.minWpm);

    // Check user has enough XP
    if ((user.xp ?? 0) < xpCost) {
      showPrToast(`⚠️ Not enough XP! Need ${xpCost} XP but you have ${user.xp ?? 0} XP.`);
      setShowPowerUpOffer(false);
      return;
    }

    // Deduct XP via API
    const token = localStorage.getItem('typementor_token');
    if (token && user.id) {
      try {
        await fetch(getApiUrl('/api/auth/profile/spend-xp'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ amount: xpCost, reason: `Power-Up: Lesson ${selectedLesson.id} WPM reduced to ${reducedMinWpm}` }),
        });
        // Refresh profile so XP bar updates
        fetchProfile();
      } catch {
        // If API call fails we still apply power-up locally (fallback)
      }
    }

    // Apply the power-up for this one round
    setActivePowerUp({ reducedMinWpm, xpCost });
    setShowPowerUpOffer(false);
    setPowerUpActivated(true);
    // Auto-hide burst animation after 3.5s
    setTimeout(() => setPowerUpActivated(false), 3500);
    // Reset fail count since they're getting a fresh start
    setLessonFailCount(0);
    // Restart lesson with the power active
    startLesson(selectedLesson);
  };

  const handleAcceptBribe = async () => {
    if (!selectedLesson || !user) return;
    const bribeCost = Math.floor((user.xp ?? 0) * 0.70);

    // Stop voice if it's still playing
    window.speechSynthesis.cancel();

    // Deduct XP via API
    const token = localStorage.getItem('typementor_token');
    if (token && user.id) {
      try {
        await fetch(getApiUrl('/api/auth/profile/spend-xp'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ amount: bribeCost, reason: `Shady Bribe to skip Lesson ${selectedLesson.id}` }),
        });
        fetchProfile();
      } catch {
        // Silently fail API, frontend state will still update temporarily
      }
    }

    setShowBribeOffer(false);
    setLessonFailCount(0);
    // Grant minimal passing score to advance
    completeLesson(selectedLesson.id, selectedLesson.minWpm, selectedLesson.minAccuracy);
  };

  // ── Assessment Test Mechanics ─────────────────────────────────────────────
  const startAssessment = () => {
    setTestText('Good posture is key to touch typing. Keep your wrists straight and elbows relaxed. Focus on typing accurately without looking down at the keyboard. Regular practice will help you build fast motor responses.');
    setTestTyped('');
    setTestStarted(false);
    setTestStart(null);
    setTestEnd(null);
    setTestErrors(0);
    setRecommendedLevel(null);
    setIsPaused(false);
    setPauseTime(null);
    setTimeout(() => testInputRef.current?.focus(), 150);
  };

  const handleTestChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (testEnd !== null || isPaused) return;
    const value = e.target.value;
    if (!testStarted) {
      setTestStarted(true);
      setTestStart(Date.now());
    }

    if (value.length > testTyped.length) {
      const lastChar = value[value.length - 1];
      const expectedChar = testText[value.length - 1];
      if (lastChar !== expectedChar) {
        setTestErrors(prev => prev + 1);
      }
      if (lastChar === ' ') {
        soundEngine.play('space');
      } else if (lastChar === '\n') {
        soundEngine.play('enter');
      } else {
        soundEngine.play('key');
      }
    } else if (value.length < testTyped.length) {
      soundEngine.play('backspace');
    }

    setTestTyped(value);

    if (value.length === testText.length) {
      const completionTime = Date.now();
      setTestEnd(completionTime);
      const duration = (completionTime - (testStart || completionTime)) / 60000;
      const wpm = duration > 0 ? Math.round((testText.split(' ').length) / duration) : 0;
      const acc = Math.round(((testText.length - testErrors) / testText.length) * 100);

      // Recommendation logic
      if (wpm >= 55 && acc >= 93) {
        setRecommendedLevel('Advanced Course');
      } else if (wpm >= 30 && acc >= 90) {
        setRecommendedLevel('Intermediate Course');
      } else {
        setRecommendedLevel('Beginner Course (Recommended)');
      }
    }
  };

  const handleOpenCertificate = (course: 'beginner' | 'intermediate') => {
    const savedResultsStr = localStorage.getItem(getStorageKey('academy_lesson_results', user?.id));
    const savedResults = savedResultsStr ? JSON.parse(savedResultsStr) : {};
    const finalLessonId = course === 'beginner' ? 30 : 50;
    const finalLessonStats = savedResults[finalLessonId] || { wpm: course === 'beginner' ? 35 : 50, accuracy: 95 };
    triggerMilestoneCelebration(course, finalLessonStats.wpm, finalLessonStats.accuracy);
  };

  const nextRecommendedBeginner = ACADEMY_LESSONS.filter(l => l.id <= 30).find(l => !completedLessons.includes(l.id));
  const nextRecommendedIntermediate = ACADEMY_LESSONS.filter(l => l.id > 30 && l.id <= 50).find(l => !completedLessons.includes(l.id));

  const progressPercent = Math.round((completedLessons.length / ACADEMY_LESSONS.length) * 100);

  // Active target character details for key highlighting
  const currentExpectedChar = selectedLesson && typedText.length < selectedLesson.text.length && endTime === null
    ? selectedLesson.text[typedText.length].toUpperCase()
    : '';

  const activeFinger = KEY_TO_FINGER[currentExpectedChar] || 'None';

  // Generate falling confetti particles
  const confettiColors = ['#f59e0b', '#3b82f6', '#10b981', '#ec4899', '#8b5cf6', '#ef4444'];
  const confettiParticles = Array.from({ length: 40 }).map((_, i) => {
    const color = confettiColors[Math.floor(Math.random() * confettiColors.length)];
    const delay = `${(Math.random() * 4).toFixed(2)}s`;
    const duration = `${(2.5 + Math.random() * 2.5).toFixed(2)}s`;
    const left = `${(Math.random() * 100).toFixed(2)}%`;
    return (
      <div
        key={i}
        className="absolute pointer-events-none"
        style={{
          left,
          top: '-15px',
          backgroundColor: color,
          width: `${Math.floor(Math.random() * 8) + 6}px`,
          height: `${Math.floor(Math.random() * 12) + 6}px`,
          opacity: 0.85,
          borderRadius: '2px',
          transform: 'rotate(0deg)',
          animation: `academyConfettiFall ${duration} linear infinite`,
          animationDelay: delay,
        }}
      />
    );
  });

  return (
    <div className="space-y-8 pb-12 text-left max-w-7xl mx-auto font-sans relative">
      <SEOMeta
        title="Typing Academy — TypeMentor AI | Structured Typing Lessons"
        description="Learn to type faster with TypeMentor AI's Typing Academy. 50+ structured lessons covering home row basics, coding syntax, and advanced touch typing. Free for everyone."
        canonical="https://typementor-ai-frontend.vercel.app/academy"
      />
      {/* CSS Confetti keyframes styling */}
      <style>{`
        @keyframes academyConfettiFall {
          0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
        }
        @keyframes powerUpBurst {
          0%   { transform: scale(0.6) translateY(30px); opacity: 0; }
          40%  { transform: scale(1.08) translateY(-6px); opacity: 1; }
          70%  { transform: scale(0.97) translateY(0); }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes powerUpGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(234,179,8,0.4), 0 0 60px rgba(234,179,8,0.15); }
          50%       { box-shadow: 0 0 40px rgba(234,179,8,0.8), 0 0 80px rgba(234,179,8,0.4); }
        }
        .power-up-burst { animation: powerUpBurst 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        .power-up-glow  { animation: powerUpGlow  1.4s ease-in-out infinite; }
      `}</style>

      {/* ── Power-Up Activation Burst Banner (appears top-center for 3.5s) ── */}
      {powerUpActivated && selectedLesson && activePowerUp && (
        <div className="fixed inset-0 z-[100] pointer-events-none flex items-start justify-center pt-24 px-4">
          <div className="power-up-burst power-up-glow max-w-sm w-full rounded-2xl border border-yellow-500/60
            bg-gradient-to-br from-yellow-950/95 via-gray-900/98 to-gray-950/95 backdrop-blur-lg
            p-6 text-center shadow-2xl">
            {/* Sparkle icon */}
            <div className="flex justify-center mb-3">
              <div className="relative w-14 h-14 rounded-full bg-yellow-500/20 border border-yellow-500/50
                flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-yellow-500/20 animate-ping" />
                <Zap className="w-7 h-7 text-yellow-400 relative z-10" />
              </div>
            </div>

            <div className="text-[10px] font-black text-yellow-400 uppercase tracking-widest mb-1">
              ⚡ Power-Up Activated!
            </div>
            <h3 className="text-lg font-black text-white mb-1">AI Assist Engaged</h3>
            <p className="text-sm font-bold text-yellow-300 mb-2">
              WPM Requirement: <span className="line-through text-gray-500">{selectedLesson.minWpm}</span>
              {' '}<span className="text-green-400">→ {activePowerUp.reducedMinWpm} WPM</span>
            </p>
            <p className="text-xs text-gray-400 leading-relaxed mb-3">
              This is a one-round assistance. Your pass will be recorded normally. Power-ups are meant to help you
              break through — not replace practice. Keep training hard! 💪
            </p>
            {/* Disclaimer */}
            <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/20
              rounded-xl p-2.5 text-left">
              <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-yellow-400/80 leading-relaxed">
                <strong>Disclaimer:</strong> This power-up is valid for this attempt only.
                Spending {activePowerUp.xpCost} XP is permanent. Results still count for your lesson history.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Power-Up Offer Modal (after 5 fails) ── */}
      {showPowerUpOffer && selectedLesson && user && (() => {
        const { reducedMinWpm, xpCost } = calcPowerUpCost(selectedLesson.minWpm);
        const canAfford = (user.xp ?? 0) >= xpCost;
        return (
          <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 backdrop-blur-sm px-4"
            onClick={() => setShowPowerUpOffer(false)}>
            <div className="relative max-w-md w-full rounded-2xl border border-yellow-500/40
              bg-gradient-to-br from-gray-900/98 to-gray-950/98 backdrop-blur-lg p-7 shadow-2xl"
              style={{ boxShadow: '0 0 60px rgba(234,179,8,0.2)' }}
              onClick={e => e.stopPropagation()}>

              {/* Close */}
              <button onClick={() => setShowPowerUpOffer(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-300 transition-colors">
                <X className="w-5 h-5" />
              </button>

              {/* Header */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-xl bg-yellow-500/20 border border-yellow-500/40
                  flex items-center justify-center flex-shrink-0">
                  <Zap className="w-6 h-6 text-yellow-400" />
                </div>
                <div>
                  <div className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">
                    AI Power-Up Available
                  </div>
                  <h2 className="text-lg font-black text-white leading-tight">
                    Stuck on Lesson {selectedLesson.id}?
                  </h2>
                </div>
              </div>

              {/* Fail count badge */}
              <div className="flex items-center gap-2 mb-4 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                <span className="text-sm">😤</span>
                <p className="text-xs text-red-300 font-semibold">
                  You've failed <strong className="text-red-400">{lessonFailCount} times</strong> on this lesson.
                  Our AI wants to help you through.
                </p>
              </div>

              {/* The deal */}
              <div className="bg-white/4 border border-white/8 rounded-xl p-4 mb-4 space-y-3">
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">The Offer</p>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-gray-500 block">Current requirement</span>
                    <span className="text-lg font-black text-white">{selectedLesson.minWpm} <span className="text-xs font-normal text-gray-500">WPM</span></span>
                  </div>
                  <div className="text-2xl text-yellow-400">→</div>
                  <div>
                    <span className="text-xs text-gray-500 block">Power-Up requirement</span>
                    <span className="text-2xl font-black text-green-400">{reducedMinWpm} <span className="text-xs font-normal text-gray-500">WPM</span></span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-500 block">XP Cost</span>
                    <span className={`text-xl font-black ${canAfford ? 'text-yellow-400' : 'text-red-400'}`}>
                      {xpCost} <span className="text-xs font-normal text-gray-500">XP</span>
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-600 border-t border-white/5 pt-2">
                  <span>Your XP balance: <strong className={canAfford ? 'text-cyan-400' : 'text-red-400'}>{user.xp ?? 0}</strong></span>
                  <span>After purchase: <strong className={canAfford ? 'text-gray-300' : 'text-red-500'}>{(user.xp ?? 0) - xpCost}</strong></span>
                </div>
              </div>

              {/* Disclaimer */}
              <div className="flex items-start gap-2 bg-yellow-500/8 border border-yellow-500/20 rounded-xl p-3 mb-5">
                <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div className="text-[11px] text-yellow-400/80 leading-relaxed">
                  <strong className="text-yellow-400">Important:</strong> This power-up applies to <em>this one attempt only</em>.
                  WPM reduction is {Math.round((1 - reducedMinWpm / selectedLesson.minWpm) * 100)}% (from {selectedLesson.minWpm} → {reducedMinWpm} WPM).
                  XP cost is permanent and non-refundable. Your lesson pass will still be counted as legitimate progress.
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleActivatePowerUp}
                  disabled={!canAfford}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-all
                    ${canAfford
                      ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-gray-950 hover:from-yellow-400 hover:to-amber-400 shadow-lg shadow-yellow-500/25'
                      : 'bg-gray-800 text-gray-600 cursor-not-allowed border border-gray-700'}`}
                >
                  <Zap className="w-4 h-4" />
                  {canAfford ? `Spend ${xpCost} XP & Activate` : `Need ${xpCost - (user.xp ?? 0)} more XP`}
                </button>
                <button
                  onClick={() => { setShowPowerUpOffer(false); if (selectedLesson) startLesson(selectedLesson); }}
                  className="flex-1 py-3 rounded-xl font-bold text-sm border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-all"
                >
                  Keep Trying Free
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Shady Bribe Modal (after 3 fails) ── */}
      {showBribeOffer && selectedLesson && user && (() => {
        const bribeCost = Math.floor((user.xp ?? 0) * 0.70);
        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md px-4"
               style={{ perspective: '1200px' }}>
            <div className="relative max-w-sm w-full rounded-2xl bg-gray-950 p-6 shadow-2xl border border-red-900/50"
                 style={{ 
                   transform: 'rotateX(8deg) translateY(-10px)',
                   boxShadow: '0 25px 50px -12px rgba(220, 38, 38, 0.25), 0 0 40px rgba(0, 0, 0, 0.8) inset',
                   transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                 }}>
              
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-red-950/50 border border-red-900 flex items-center justify-center animate-pulse">
                  <Lock className="w-8 h-8 text-red-500" />
                </div>
                
                <h3 className="text-xl font-black tracking-widest text-red-500 uppercase">Psst... Stuck?</h3>
                
                <p className="text-sm text-gray-400 font-medium leading-relaxed">
                  I can forge your academy certificate for <strong className="text-white">Lesson {selectedLesson.id}</strong> right now. Nobody has to know.
                </p>

                <div className="w-full bg-black/60 rounded-xl border border-white/5 p-4 my-2">
                  <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">The Price</p>
                  <p className="text-3xl font-black text-red-500">{bribeCost} <span className="text-sm text-red-800">XP</span></p>
                  <p className="text-[10px] text-gray-600 mt-1">(70% of your total XP)</p>
                </div>

                <div className="flex flex-col w-full gap-3 mt-4">
                  <button 
                    onClick={handleAcceptBribe}
                    className="w-full py-3 rounded-lg font-black text-sm uppercase tracking-wider bg-red-600 hover:bg-red-500 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all">
                    Pay {bribeCost} XP to Skip
                  </button>
                  <button 
                    onClick={() => {
                      window.speechSynthesis.cancel();
                      setShowBribeOffer(false);
                      if (selectedLesson) startLesson(selectedLesson);
                    }}
                    className="w-full py-3 rounded-lg font-bold text-xs uppercase tracking-wider text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors">
                    No thanks, I'll keep trying
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Onboarding welcome badge */}

      <div className="bg-brand-primary/10 border border-brand-primary/20 p-4 rounded-2xl flex items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-black tracking-widest text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded-md">
            New Onboarding Module
          </span>
          <h3 className="text-sm font-bold text-white">Start here if you are new to touch typing.</h3>
          <p className="text-xs text-brand-muted">Typing Academy teaches proper mechanics, row movements, and muscle memory from scratch.</p>
        </div>
        <div className="text-right hidden sm:block">
          <span className="text-xs text-brand-muted font-bold block">Academy Progress</span>
          <span className="text-lg font-black text-brand-success font-mono">{progressPercent}%</span>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="flex bg-brand-card/30 p-1 rounded-xl border border-brand-border/40 max-w-md w-full">
        {(['beginner', 'intermediate', 'test'] as const).map(tab => {
          let label = '';
          let isLocked = false;
          let isCompleted = false;

          if (tab === 'beginner') {
            label = 'Beginner';
            isCompleted = isBeginnerCompleted;
          } else if (tab === 'intermediate') {
            label = 'Intermediate';
            isLocked = !isIntermediateUnlocked;
            isCompleted = isIntermediateCompleted;
          } else {
            label = 'Assessment Test';
            isLocked = !isTestUnlocked;
          }

          return (
            <button
              key={tab}
              onClick={() => {
                if (isLocked) {
                  showPrToast(`🔒 Complete previous stages to unlock ${tab} Course.`);
                  return;
                }
                setActiveTab(tab);
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold capitalize transition-all flex items-center justify-center gap-1.5 ${
                isLocked ? 'opacity-40 cursor-not-allowed' : ''
              } ${
                activeTab === tab
                  ? 'bg-brand-primary text-white shadow-md'
                  : 'text-brand-muted hover:text-white'
              }`}
            >
              {isLocked && <Lock className="w-3.5 h-3.5" />}
              {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-brand-success" />}
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* SECTION 1: Beginner Course Map */}
      {activeTab === 'beginner' && !selectedLesson && (
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-brand-border/40 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-1.5 text-center sm:text-left">
              <h3 className="text-xl font-extrabold text-white">Beginner Typing Syllabus</h3>
              <p className="text-xs text-brand-muted">30 Progressive touch typing lessons starting from zero. Complete lessons to unlock the next levels.</p>
            </div>
            <div className="flex flex-wrap gap-3 justify-center sm:justify-end">
              {isBeginnerCompleted && (
                <button
                  onClick={() => handleOpenCertificate('beginner')}
                  className="px-5 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1.5 shadow-lg shadow-amber-550/20"
                >
                  <Award className="w-4 h-4" />
                  View Certificate
                </button>
              )}
              {nextRecommendedBeginner && (
                <button
                  onClick={() => startLesson(nextRecommendedBeginner)}
                  className="px-5 py-3 bg-brand-success text-slate-950 font-extrabold text-xs rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1.5"
                >
                  Continue Course
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Lessons Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ACADEMY_LESSONS.filter(l => l.id <= 30).map((lesson) => {
              const isCompleted = completedLessons.includes(lesson.id);
              const isUnlocked = lesson.id === 1 || completedLessons.includes(lesson.id - 1);

              return (
                <div
                  key={lesson.id}
                  onClick={() => isUnlocked && startLesson(lesson)}
                  className={`p-5 rounded-2xl border transition-all ${
                    isUnlocked
                      ? 'bg-brand-card/45 border-brand-border/60 hover:border-brand-primary/60 cursor-pointer'
                      : 'bg-brand-bg/25 border-brand-border/20 opacity-50 select-none cursor-not-allowed'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-mono text-brand-muted">Lesson {lesson.id.toString().padStart(2, '0')}</span>
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-brand-success" />
                    ) : !isUnlocked ? (
                      <Lock className="w-4 h-4 text-brand-muted" />
                    ) : (
                      <span className="w-2.5 h-2.5 rounded-full bg-brand-primary animate-ping" />
                    )}
                  </div>

                  <h4 className="font-extrabold text-sm text-white mt-2.5">{lesson.title}</h4>
                  <p className="text-[11px] text-brand-muted mt-1 leading-relaxed">{lesson.goal}</p>

                  <div className="mt-4 flex flex-wrap gap-1">
                    {lesson.keys.map(k => (
                      <span key={k} className="px-1.5 py-0.5 bg-slate-950 rounded text-[9px] font-mono text-brand-primary uppercase">
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 2: Intermediate Syllabus */}
      {activeTab === 'intermediate' && !selectedLesson && (
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-brand-border/40 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-1.5 text-center sm:text-left">
              <h3 className="text-xl font-extrabold text-white">Intermediate Typing Syllabus</h3>
              <p className="text-xs text-brand-muted">20 Intermediate lessons focusing on longer words, punctuation, capital letters, and numbers.</p>
            </div>
            <div className="flex flex-wrap gap-3 justify-center sm:justify-end">
              {isIntermediateCompleted && (
                <button
                  onClick={() => handleOpenCertificate('intermediate')}
                  className="px-5 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1.5 shadow-lg shadow-amber-550/20"
                >
                  <Award className="w-4 h-4" />
                  View Certificate
                </button>
              )}
              {nextRecommendedIntermediate && (
                <button
                  onClick={() => startLesson(nextRecommendedIntermediate)}
                  className="px-5 py-3 bg-brand-success text-slate-950 font-extrabold text-xs rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1.5"
                >
                  Continue Course
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Lessons Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ACADEMY_LESSONS.filter(l => l.id > 30 && l.id <= 50).map((lesson) => {
              const isCompleted = completedLessons.includes(lesson.id);
              const isUnlocked = lesson.id === 31 || completedLessons.includes(lesson.id - 1);

              return (
                <div
                  key={lesson.id}
                  onClick={() => isUnlocked && startLesson(lesson)}
                  className={`p-5 rounded-2xl border transition-all ${
                    isUnlocked
                      ? 'bg-brand-card/45 border-brand-border/60 hover:border-brand-primary/60 cursor-pointer'
                      : 'bg-brand-bg/25 border-brand-border/20 opacity-50 select-none cursor-not-allowed'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-mono text-brand-muted">Lesson {lesson.id.toString().padStart(2, '0')}</span>
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-brand-success" />
                    ) : !isUnlocked ? (
                      <Lock className="w-4 h-4 text-brand-muted" />
                    ) : (
                      <span className="w-2.5 h-2.5 rounded-full bg-brand-primary animate-ping" />
                    )}
                  </div>

                  <h4 className="font-extrabold text-sm text-white mt-2.5">{lesson.title}</h4>
                  <p className="text-[11px] text-brand-muted mt-1 leading-relaxed">{lesson.goal}</p>

                  <div className="mt-4 flex flex-wrap gap-1">
                    {lesson.keys.map(k => (
                      <span key={k} className="px-1.5 py-0.5 bg-slate-950 rounded text-[9px] font-mono text-brand-primary uppercase">
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 3: Assessment Test Deck */}
      {activeTab === 'test' && (
        <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-brand-border/40 space-y-6">
          <div className="border-b border-brand-border/20 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="font-bold text-white text-base">Academy Skill Placement Test</h3>
              <p className="text-xs text-brand-muted mt-0.5">Evaluate your touch typing mechanics. We will recommend the best course level for you.</p>
            </div>
            <button
              onClick={startAssessment}
              className="px-4 py-2 bg-brand-primary text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
            >
              <RefreshCw className="w-4 h-4" />
              Reset Test
            </button>
          </div>

          {!testStart && !recommendedLevel && (
            <div className="py-12 text-center">
              <button
                onClick={startAssessment}
                className="px-6 py-3 bg-brand-success text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider"
              >
                Start Typing Assessment
              </button>
            </div>
          )}

          {(testStart || testEnd) && (
            <div className="space-y-6">
              {/* Hidden text area */}
              <textarea
                ref={testInputRef}
                value={testTyped}
                onChange={handleTestChange}
                className="absolute opacity-0 pointer-events-none"
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
              />

              {/* Text display board */}
              <div className="relative">
                <div
                  onClick={() => !isPaused && testInputRef.current?.focus()}
                  className="p-5 bg-brand-bg/50 border border-brand-border/30 rounded-xl cursor-text font-mono text-base leading-relaxed text-slate-400 select-none text-left"
                >
                  {testText.split('').map((char, index) => {
                    let colorClass = 'text-slate-500';
                    let cursor = '';

                    if (index < testTyped.length) {
                      colorClass = testTyped[index] === char ? 'text-white' : 'text-brand-danger bg-brand-danger/10 border-b border-brand-danger';
                    } else if (index === testTyped.length) {
                      colorClass = 'text-brand-primary';
                      cursor = 'border-l-2 border-brand-primary animate-pulse';
                    }

                    return <span key={index} className={`${colorClass} ${cursor}`}>{char}</span>;
                  })}
                </div>

                {isPaused && testStart && !testEnd && (
                  <div
                    className="absolute inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-200 cursor-pointer rounded-xl"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleResume();
                    }}
                  >
                    <div className="bg-brand-card/90 border border-brand-border/80 p-5 rounded-2xl text-center max-w-sm mx-4 space-y-3 shadow-2xl">
                      <div className="inline-flex p-2.5 rounded-full bg-brand-primary/10 border border-brand-primary/30 text-brand-primary animate-pulse">
                        <Timer className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white">Assessment Paused</h4>
                        <p className="text-[10px] text-brand-muted mt-1 leading-relaxed">
                          You have been inactive. Click or touch anywhere to resume.
                        </p>
                      </div>
                      <button className="w-full py-1.5 bg-brand-primary hover:bg-brand-primary/95 text-white font-bold rounded-xl text-[11px] transition-all shadow-md">
                        Resume
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {recommendedLevel && (
            <div className="bg-brand-primary/10 border border-brand-primary/30 p-6 rounded-2xl flex flex-col items-center text-center space-y-4">
              <Star className="w-10 h-10 text-brand-warning animate-bounce" />
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-brand-muted uppercase">Recommended Placement</span>
                <h4 className="text-xl font-extrabold text-white">{recommendedLevel}</h4>
              </div>
              <p className="text-xs text-brand-muted max-w-md">
                Assessment finished. You clocked {(testText.split(' ').length / ((testEnd! - testStart!) / 60000)).toFixed(0)} WPM with {Math.round(((testText.length - testErrors) / testText.length) * 100)}% accuracy.
              </p>
              <button
                onClick={() => {
                  setActiveTab('beginner');
                  setRecommendedLevel(null);
                }}
                className="px-4 py-2 bg-white text-slate-950 font-bold text-xs rounded-xl"
              >
                Go to Beginner Syllabus
              </button>
            </div>
          )}
        </div>
      )}

      {/* ACTIVE LESSON TYPING WORKSPACE */}
      {selectedLesson && (
        <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-brand-border/40 space-y-6">
          <div className="flex justify-between items-center border-b border-brand-border/20 pb-4">
            <div>
              <span className="text-[10px] text-brand-muted font-bold font-mono">Lesson {selectedLesson.id}</span>
              <h3 className="font-extrabold text-white text-base mt-0.5">{selectedLesson.title}</h3>
            </div>
            <button
              onClick={() => setSelectedLesson(null)}
              className="text-xs text-brand-muted hover:text-white"
            >
              Exit Lesson
            </button>
          </div>

          <p className="text-xs text-brand-muted leading-relaxed max-w-2xl bg-brand-bg/50 p-4 rounded-xl border border-brand-border/20">
            <span className="font-bold text-white block mb-1">Finger Placement:</span>
            {selectedLesson.placement}
          </p>

          <textarea
            ref={inputRef}
            value={typedText}
            onChange={handleInputChange}
            className="absolute opacity-0 pointer-events-none"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />

          {/* Practice Text Display Deck */}
          <div className="relative">
            <div
              onClick={() => !isPaused && focusTypingInput()}
              className="p-6 bg-brand-bg/50 border border-brand-border/30 rounded-xl font-mono text-lg leading-relaxed text-slate-400 select-none text-left cursor-text"
            >
              {selectedLesson.text.split('').map((char, index) => {
                let colorClass = 'text-slate-500';
                let cursor = '';

                if (index < typedText.length) {
                  colorClass = typedText[index] === char ? 'text-white' : 'text-brand-danger bg-brand-danger/10 border-b border-brand-danger';
                } else if (index === typedText.length) {
                  colorClass = 'text-brand-primary';
                  cursor = 'border-l-2 border-brand-primary animate-pulse';
                }

                return <span key={index} className={`${colorClass} ${cursor}`}>{char}</span>;
              })}
            </div>

            {isPaused && selectedLesson && startTime && !endTime && (
              <div
                className="absolute inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-200 cursor-pointer rounded-xl"
                onClick={(e) => {
                  e.stopPropagation();
                  handleResume();
                }}
              >
                <div className="bg-brand-card/90 border border-brand-border/80 p-5 rounded-2xl text-center max-w-sm mx-4 space-y-3 shadow-2xl">
                  <div className="inline-flex p-2.5 rounded-full bg-brand-primary/10 border border-brand-primary/30 text-brand-primary animate-pulse">
                    <Timer className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white">Lesson Paused</h4>
                    <p className="text-[10px] text-brand-muted mt-1 leading-relaxed">
                      You have been inactive. Click or touch anywhere to resume.
                    </p>
                  </div>
                  <button className="w-full py-1.5 bg-brand-primary hover:bg-brand-primary/95 text-white font-bold rounded-xl text-[11px] transition-all shadow-md">
                    Resume
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Results overlay when finished */}
          {endTime && finalResult && (
            <div className="bg-brand-primary/10 border border-brand-primary/20 p-5 rounded-2xl flex flex-col gap-4 font-mono w-full">
              <div className="flex flex-wrap gap-6 text-xs text-left">
                <div>
                  <span className="text-brand-muted block">Speed:</span>
                  <span className="text-white font-bold">{finalResult.wpm} WPM</span>
                </div>
                <div>
                  <span className="text-brand-muted block">Accuracy:</span>
                  <span className="text-white font-bold">{finalResult.accuracy}%</span>
                </div>
                <div>
                  <span className="text-brand-muted block">Criteria:</span>
                  <span className="text-white font-bold">{selectedLesson.minWpm} WPM / {selectedLesson.minAccuracy}%</span>
                </div>
                <div>
                  <span className="text-brand-muted block">Backspaces:</span>
                  <span className="text-white font-bold">{backspacesLog.length}</span>
                </div>
                <div>
                  <span className="text-brand-muted block">Habit Rating:</span>
                  {(() => {
                    const ratio = selectedLesson.text.length > 0 ? backspacesLog.length / selectedLesson.text.length : 0;
                    let habitRating = 'Low';
                    let habitColor = 'text-brand-success';
                    if (ratio > 0.12 || backspacesLog.length > 15) {
                      habitRating = 'High';
                      habitColor = 'text-brand-danger';
                    } else if (ratio > 0.05 || backspacesLog.length > 5) {
                      habitRating = 'Moderate';
                      habitColor = 'text-brand-warning';
                    }
                    return <span className={`font-bold ${habitColor}`}>{habitRating}</span>;
                  })()}
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-between items-center border-t border-brand-border/20 pt-3 gap-3">
                <span className="text-[10px] text-brand-muted">
                  Backspace corrects mistakes, but keeping rhythm is key to long-term typing success.
                </span>
                <button
                  onClick={() => {
                    const nextId = selectedLesson.id + 1;
                    const next = ACADEMY_LESSONS.find(l => l.id === nextId);
                    const isSuccess = completedLessons.includes(selectedLesson.id);
                    if (isSuccess && next) {
                      startLesson(next);
                    } else if (!isSuccess) {
                      // Restart the current lesson (Try Again)
                      startLesson(selectedLesson);
                    } else {
                      setSelectedLesson(null);
                    }
                  }}
                  className="px-4 py-2 bg-brand-success text-slate-950 font-bold text-xs rounded-xl self-end"
                >
                  {completedLessons.includes(selectedLesson.id) ? 'Next Lesson' : 'Try Again'}
                </button>
              </div>
            </div>
          )}

          {/* FINGER GUIDANCE INTERFACE CONTAINER */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
            
            {/* Visual Keyboard Row */}
            <div className="lg:col-span-2 space-y-4">
              <h4 className="text-xs font-bold text-brand-muted uppercase tracking-wider text-left">Virtual Keyboard Guide</h4>
              
              <div className="bg-slate-950/60 p-4 rounded-2xl border border-brand-border/40 space-y-2 max-w-full overflow-x-auto">
                {KEYBOARD_ROWS.map((row, rIdx) => (
                  <div key={rIdx} className="flex justify-center gap-1 min-w-max">
                    {row.map(key => {
                      const finger = KEY_TO_FINGER[key.toUpperCase()] || 'None';
                      const fingerTheme = FINGER_COLORS[finger];
                      
                      const isTarget = key.toUpperCase() === currentExpectedChar;

                      return (
                        <div
                          key={key}
                          className={`w-9 h-9 sm:w-11 sm:h-11 rounded-lg border text-xs font-bold flex items-center justify-center transition-all duration-150 uppercase ${
                            isTarget
                              ? fingerTheme?.activeBg || 'bg-brand-primary border-brand-primary text-slate-950'
                              : `${fingerTheme?.bg || 'bg-slate-900'} ${fingerTheme?.border || 'border-brand-border/30'} ${fingerTheme?.text || 'text-slate-400'}`
                          }`}
                        >
                          {key}
                        </div>
                      );
                    })}
                  </div>
                ))}
                
                {/* Spacebar Row */}
                <div className="flex justify-center min-w-max pt-1">
                  <div
                    className={`h-9 sm:h-11 rounded-lg border text-xs font-bold flex items-center justify-center transition-all duration-150 uppercase ${
                      currentExpectedChar === ' '
                        ? FINGER_COLORS['Thumb'].activeBg
                        : 'bg-slate-900 border-brand-border/30 text-slate-400'
                    }`}
                    style={{ width: '45%' }}
                  >
                    Spacebar
                  </div>
                </div>
              </div>
            </div>

            {/* Hand Finger Guides */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-brand-muted uppercase tracking-wider text-left">Active Finger Focus</h4>
              
              <div className="glass-panel p-5 rounded-2xl border border-brand-border/40 flex flex-col justify-center items-center space-y-4 min-h-[160px]">
                {activeFinger !== 'None' ? (
                  <div className="text-center space-y-3">
                    <span className="text-[10px] text-brand-muted font-bold uppercase block font-mono">Suggested Finger</span>
                    <div className="flex items-center justify-center gap-3">
                      <span className={`w-3 h-3 rounded-full animate-ping ${
                        activeFinger.startsWith('Left') ? 'bg-rose-500' : activeFinger.startsWith('Right') ? 'bg-blue-500' : 'bg-slate-400'
                      }`} />
                      <h4 className="text-xl font-extrabold text-white">{activeFinger}</h4>
                    </div>
                    
                    {/* Active finger visual connection label */}
                    <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold uppercase font-mono tracking-wider ${
                      FINGER_COLORS[activeFinger]?.border
                    } ${FINGER_COLORS[activeFinger]?.text}`}>
                      Finger Theme Active
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-xs text-brand-muted py-6">
                    <Info className="w-5 h-5 text-brand-muted mx-auto mb-2" />
                    Place fingers on standard home row anchors.
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* PREMIUM CELEBRATION & CERTIFICATE PREVIEW MODAL */}
      {showCelebration && celebrationCourse && celebrationStats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          {/* Confetti Container */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {confettiParticles}
          </div>

          <div className="relative bg-slate-900 border border-brand-border/60 rounded-3xl p-6 sm:p-8 max-w-3xl w-full text-center space-y-6 shadow-2xl scale-[1.02] transition-transform duration-300">
            {/* Close Button */}
            <button
              onClick={() => setShowCelebration(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-brand-muted hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Title / Badge */}
            <div className="space-y-2">
              <div className="inline-flex items-center justify-center p-3 bg-amber-500/10 text-amber-500 rounded-full border border-amber-550/20 mb-2 animate-bounce">
                <Sparkles className="w-8 h-8" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Course Completed!
              </h2>
              <p className="text-xs text-brand-muted max-w-md mx-auto">
                Incredible determination! You completed the {celebrationCourse === 'beginner' ? 'Beginner' : 'Intermediate'} course track. Here is your official TypeMentor AI certificate.
              </p>
            </div>

            {/* Performance Stats */}
            <div className="grid grid-cols-3 gap-3 max-w-md mx-auto bg-slate-950/40 p-4 rounded-2xl border border-brand-border/20">
              <div>
                <span className="text-[10px] text-brand-muted block font-bold uppercase tracking-wider">Avg WPM</span>
                <span className="text-lg font-black text-amber-500 font-mono">{celebrationStats.avgWpm}</span>
              </div>
              <div>
                <span className="text-[10px] text-brand-muted block font-bold uppercase tracking-wider">Avg Accuracy</span>
                <span className="text-lg font-black text-brand-success font-mono">{celebrationStats.avgAccuracy}%</span>
              </div>
              <div>
                <span className="text-[10px] text-brand-muted block font-bold uppercase tracking-wider">Lessons</span>
                <span className="text-lg font-black text-brand-primary font-mono">{celebrationStats.lessonsCompleted}</span>
              </div>
            </div>

            {/* HTML Certificate Preview Container */}
            <div className="border border-brand-border/40 rounded-2xl overflow-hidden bg-slate-950 p-4 sm:p-6 text-left relative shadow-inner max-w-full">
              {/* Golden frame border decoration */}
              <div className="absolute inset-2 border border-amber-500/30 rounded-xl pointer-events-none" />
              
              <div className="flex justify-between items-start border-b border-brand-border/20 pb-3 mb-3">
                <div>
                  <h4 className="text-xs font-black text-white tracking-widest uppercase">TYPEMENTOR AI</h4>
                  <span className="text-[8px] text-brand-muted font-bold font-mono">ACADEMY VERIFIED VERDICT</span>
                </div>
                <Award className="w-6 h-6 text-amber-500" />
              </div>

              <div className="space-y-3">
                <div className="text-center py-2 space-y-1">
                  <h5 className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Certificate of Completion</h5>
                  <p className="text-sm font-extrabold text-white">{userName}</p>
                </div>

                <p className="text-[10px] text-brand-muted leading-relaxed text-center">
                  Successfully completed the <span className="text-white font-bold">{celebrationCourse === 'beginner' ? 'Beginner Touch Typing Course' : 'Intermediate Touch Typing Course'}</span>, mastering key positions, muscle coordination, and pacing speeds.
                </p>

                <div className="flex justify-between items-end pt-3 text-[9px] text-brand-muted font-mono">
                  <div>
                    <span className="block">Date: {new Date().toLocaleDateString()}</span>
                    <span className="block text-brand-muted">ID: {celebrationStats.certId}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-amber-500 block font-bold">TypeMentor AI branding</span>
                    <span>Best wishes for your typing journey</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <button
                onClick={handleDownloadPDF}
                className="px-6 py-3 bg-amber-550 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-2 transition-colors w-full sm:w-auto"
              >
                <Download className="w-4 h-4" />
                Download PDF Certificate
              </button>
              <button
                onClick={() => setShowCelebration(false)}
                className="px-6 py-3 bg-slate-800 hover:bg-slate-750 text-white font-bold text-xs rounded-xl transition-colors w-full sm:w-auto"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Coach Pulse Card floating badge */}
      {pulseMessage && (
        <AICoachPulseCard
          message={pulseMessage}
          onClose={clearPulse}
        />
      )}
    </div>
  );
}
