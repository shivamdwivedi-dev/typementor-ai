import { ACADEMY_LESSONS } from './academyLessons';
import { getApiUrl } from './api';

export interface LastActivity {
  type: 'academy' | 'practice' | 'endurance' | 'recovery';
  lessonId?: string; // lesson ID or mode name
  title: string;
  timestamp: number;
}

const LOCAL_KEY = 'typementor_last_activity';

// ── Save last activity locally & sync with DB if authenticated ──
export async function saveLastActivity(activity: Omit<LastActivity, 'timestamp'>) {
  const fullActivity: LastActivity = {
    ...activity,
    timestamp: Date.now(),
  };

  localStorage.setItem(LOCAL_KEY, JSON.stringify(fullActivity));

  const token = localStorage.getItem('typementor_token');
  if (token) {
    try {
      await fetch(getApiUrl('/api/auth/profile/activity'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ activity: fullActivity }),
      });
    } catch (err) {
      console.warn('Failed to sync last activity with database:', err);
    }
  }
}

// ── Get last activity either from local storage or user profile ──
export function getLastActivity(userProfile?: { lastActivity?: string } | null): LastActivity | null {
  if (userProfile?.lastActivity) {
    try {
      return JSON.parse(userProfile.lastActivity);
    } catch {
      // Fallback to local storage if parse fails
    }
  }

  const local = localStorage.getItem(LOCAL_KEY);
  return local ? JSON.parse(local) : null;
}

// ── Smart Resume Resolver ──
export interface ResumeTarget {
  type: 'academy' | 'practice' | 'endurance' | 'recovery';
  lessonId?: string;
  title: string;
  buttonLabel: string;
}

export function getSmartResumeTarget(
  completedLessonIds: number[] = [],
  weakKey: string = 'None',
  userProfile?: { lastActivity?: string } | null
): ResumeTarget {
  const lastAct = getLastActivity(userProfile);
  const completedSet = new Set(completedLessonIds);

  // 1. Incomplete Academy Lesson:
  // If their last activity was an academy lesson, and they haven't completed it yet.
  if (lastAct && lastAct.type === 'academy' && lastAct.lessonId) {
    const lessonIdNum = parseInt(lastAct.lessonId, 10);
    if (!isNaN(lessonIdNum) && !completedSet.has(lessonIdNum)) {
      return {
        type: 'academy',
        lessonId: lastAct.lessonId,
        title: lastAct.title,
        buttonLabel: `Continue ${lastAct.title}`,
      };
    }
  }

  // 2. Pending Recovery Drill:
  // If a weak-key recovery is recommended (i.e. weakKey is not 'None') and last activity was not immediately completed.
  if (weakKey && weakKey !== 'None' && weakKey !== 'undefined') {
    return {
      type: 'recovery',
      lessonId: weakKey,
      title: `AI Recovery: Target Key "${weakKey}"`,
      buttonLabel: 'Resume Recovery Drill',
    };
  }

  // 3 & 4. Continue Course Progressions:
  // Look for the next uncompleted lesson in Academy sequence.
  // First, check beginner lessons (1 to 30).
  const nextBeginner = ACADEMY_LESSONS.find(l => l.id <= 30 && !completedSet.has(l.id));
  if (nextBeginner) {
    return {
      type: 'academy',
      lessonId: String(nextBeginner.id),
      title: `Beginner Lesson ${nextBeginner.id}: ${nextBeginner.title}`,
      buttonLabel: `Continue Beginner Lesson ${nextBeginner.id}`,
    };
  }

  // Second, check intermediate lessons (31 to 50).
  const nextIntermediate = ACADEMY_LESSONS.find(l => l.id > 30 && l.id <= 50 && !completedSet.has(l.id));
  if (nextIntermediate) {
    return {
      type: 'academy',
      lessonId: String(nextIntermediate.id),
      title: `Intermediate Lesson ${nextIntermediate.id - 30}: ${nextIntermediate.title}`,
      buttonLabel: `Continue Intermediate Lesson ${nextIntermediate.id - 30}`,
    };
  }

  // 5. Continue Endurance Arena
  // If they have completed all lessons or their last session was endurance.
  if (lastAct && lastAct.type === 'endurance') {
    return {
      type: 'endurance',
      title: 'Endurance Arena',
      buttonLabel: 'Continue Endurance Arena',
    };
  }

  // 6. Start New Practice Session
  return {
    type: 'practice',
    title: 'Practice Board',
    buttonLabel: 'Start New Practice Session',
  };
}

// ── Local Analytics Logging ──
export function logResumeAnalytics(action: 'click' | 'completed' | 'abandoned') {
  const keys = {
    click: 'typementor_analytics_resume_clicks',
    completed: 'typementor_analytics_completed_after_resume',
    abandoned: 'typementor_analytics_abandoned_lessons',
  };

  const key = keys[action];
  if (key) {
    const val = parseInt(localStorage.getItem(key) || '0', 10);
    localStorage.setItem(key, String(val + 1));
  }
}
