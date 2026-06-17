import { useState, useEffect, useRef } from 'react';
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
  ChevronRight, RefreshCw, Star, Info, Award, Download, X, Sparkles, Timer
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

  // AI Coach Pulse integration
  const { pulseMessage, processPulse, clearPulse, resetSessionState } = useAICoachPulse();

  const { user } = useAuthStore();
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
  const isIntermediateUnlocked = isBeginnerCompleted || localStorage.getItem(getStorageKey('academy_intermediate_unlocked', user?.id)) === 'true';
  const isIntermediateCompleted = completedLessons.includes(50) || Array.from({ length: 20 }, (_, i) => i + 31).every(id => completedLessons.includes(id));
  const isTestUnlocked = isIntermediateCompleted || localStorage.getItem(getStorageKey('academy_test_unlocked', user?.id)) === 'true';

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

  // Reset pulse stats on lesson change
  useEffect(() => {
    resetSessionState();
  }, [selectedLesson]);

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

      if (wpm >= selectedLesson.minWpm && acc >= selectedLesson.minAccuracy) {
        completeLesson(selectedLesson.id, wpm, acc);
      } else {
        showPrToast(`⚠️ Lesson failed. Need ${selectedLesson.minWpm} WPM & ${selectedLesson.minAccuracy}% Accuracy.`);
      }
    }
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
      {/* CSS Confetti keyframes styling */}
      <style>{`
        @keyframes academyConfettiFall {
          0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
        }
      `}</style>

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
                    if (next && completedLessons.includes(selectedLesson.id)) {
                      startLesson(next);
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
