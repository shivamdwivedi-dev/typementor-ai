import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import GuestLoginGateModal from '../components/GuestLoginGateModal';
import DailyGoalTracker, {
  loadDailyFocusRecord,
  saveDailyFocusRecord,
  getLocalDateKey,
} from '../components/DailyGoalTracker';

describe('Retention and Forced Gating Architecture', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('GuestLoginGateModal', () => {
    it('does not render when isOpen is false', () => {
      render(
        <BrowserRouter>
          <GuestLoginGateModal isOpen={false} completedTests={2} />
        </BrowserRouter>
      );
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('renders forced conversion modal with metrics and value props when isOpen is true', () => {
      render(
        <BrowserRouter>
          <GuestLoginGateModal
            isOpen={true}
            lastWpm={74}
            lastAccuracy={98}
            completedTests={2}
            maxFreeTests={2}
          />
        </BrowserRouter>
      );

      // Modal dialog is present
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Heading and limit badge
      expect(screen.getByText(/GUEST LIMIT/i)).toBeInTheDocument();
      expect(screen.getByText(/SAVE YOUR SPEED & CLAIM YOUR STREAK/i)).toBeInTheDocument();

      // Scored metrics
      expect(screen.getByText('74')).toBeInTheDocument();
      expect(screen.getByText('98%')).toBeInTheDocument();

      // Retention and habit value props
      expect(screen.getByText(/Lock In Day 1 Daily Streak/i)).toBeInTheDocument();
      expect(screen.getByText(/10-Minute Daily Focus Goal/i)).toBeInTheDocument();
      expect(screen.getByText(/AI Weak-Key Diagnosis/i)).toBeInTheDocument();
      expect(screen.getByText(/1v1 Multiplayer/i)).toBeInTheDocument();
    });

    it('triggers onSignIn callback when user clicks primary CTA', () => {
      const handleSignIn = vi.fn();
      render(
        <BrowserRouter>
          <GuestLoginGateModal
            isOpen={true}
            lastWpm={80}
            lastAccuracy={99}
            completedTests={2}
            onSignIn={handleSignIn}
          />
        </BrowserRouter>
      );

      const ctaBtn = screen.getByRole('button', { name: /CLAIM YOUR STATS & UNLOCK FULL ACCESS/i });
      fireEvent.click(ctaBtn);
      expect(handleSignIn).toHaveBeenCalledTimes(1);
    });

    it('triggers onClose when Backspace or Escape is pressed to return to practice', () => {
      const handleClose = vi.fn();
      render(
        <BrowserRouter>
          <GuestLoginGateModal
            isOpen={true}
            completedTests={0}
            onClose={handleClose}
          />
        </BrowserRouter>
      );

      fireEvent.keyDown(window, { key: 'Backspace' });
      expect(handleClose).toHaveBeenCalledTimes(1);

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(2);
    });
  });

  describe('DailyGoalTracker (10-Minute Habit Engine)', () => {
    it('initializes default record for current date', () => {
      const todayKey = getLocalDateKey();
      const rec = loadDailyFocusRecord('test-user');
      expect(rec.date).toBe(todayKey);
      expect(rec.secondsToday).toBe(0);
      expect(rec.goalSeconds).toBe(600);
      expect(rec.dailyGoalCompleted).toBe(false);
    });

    it('persists and loads daily focus records in localStorage', () => {
      const todayKey = getLocalDateKey();
      const mockRecord = {
        date: todayKey,
        secondsToday: 450,
        goalSeconds: 600,
        milestone5mNotified: true,
        milestone10mNotified: false,
        dailyGoalCompleted: false,
      };

      saveDailyFocusRecord(mockRecord, 'user_123');
      const loaded = loadDailyFocusRecord('user_123');
      expect(loaded.secondsToday).toBe(450);
      expect(loaded.milestone5mNotified).toBe(true);
      expect(loaded.dailyGoalCompleted).toBe(false);
    });

    it('renders the compact focus pill with duration and opens modal on click', () => {
      const todayKey = getLocalDateKey();
      saveDailyFocusRecord(
        {
          date: todayKey,
          secondsToday: 240, // 4 mins
          goalSeconds: 600,
          milestone5mNotified: false,
          milestone10mNotified: false,
          dailyGoalCompleted: false,
        },
        'guest'
      );

      render(<DailyGoalTracker />);

      // Shows 4:00 / 10m
      expect(screen.getByText('4:00')).toBeInTheDocument();
      expect(screen.getByText('/ 10m')).toBeInTheDocument();

      // Click pill to open details
      const pillBtn = screen.getByRole('button', { name: /Focus 4:00/i });
      fireEvent.click(pillBtn);

      // Detail modal content
      expect(screen.getByText(/10-MINUTE DAILY GOAL/i)).toBeInTheDocument();
      expect(screen.getByText(/Tactile Memory Rule:/i)).toBeInTheDocument();
    });
  });
});
