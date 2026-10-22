import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { ArenaLobby } from '../components/arena/ArenaLobby';
import { CreateMatchModal } from '../components/arena/CreateMatchModal';
import { JoinMatchModal } from '../components/arena/JoinMatchModal';
import { ArenaWaitingRoom } from '../components/arena/ArenaWaitingRoom';
import { ArenaCountdown } from '../components/arena/ArenaCountdown';
import { ArenaResults } from '../components/arena/ArenaResults';
import { PublicArenaMatch, MatchHistoryItem } from '../types/arena';

describe('Frontend Arena Components & UX', () => {
  const sampleMatch: PublicArenaMatch = {
    id: 'match_test_123',
    matchCode: 'ARN888',
    creatorId: 'user_1',
    status: 'WAITING',
    passageTitle: 'Clean Architecture',
    passageWordCount: 30,
    stakeAmount: 50,
    isRanked: true,
    maxDuration: 120,
    countdownSeconds: 5,
    winnerId: null,
    isTie: false,
    settlementStatus: 'PENDING',
    createdAt: new Date().toISOString(),
    participants: [
      {
        userId: 'user_1',
        name: 'Alex Developer',
        seat: 1,
        isReady: true,
        isConnected: true,
        progressPercent: 0,
        charsTyped: 0,
        wpm: 0,
        accuracy: 100,
      },
    ],
  };

  const sampleHistory: MatchHistoryItem[] = [
    {
      id: 'hist_1',
      matchCode: 'ARN111',
      status: 'FINISHED',
      passageTitle: 'Modern Web Engine',
      stakeAmount: 50,
      playedAt: new Date().toISOString(),
      myWpm: 75.4,
      myAccuracy: 98.2,
      myOutcome: 'WIN',
      pointsDelta: 50,
      opponentName: 'Sarah Smith',
      opponentWpm: 68.2,
      opponentAccuracy: 95.0,
    },
  ];

  // ── 1. ArenaLobby ─────────────────────────────────────────────────────────
  describe('ArenaLobby', () => {
    it('renders balance, title, and action buttons', () => {
      render(
        <ArenaLobby
          userBalance={350}
          onOpenCreate={vi.fn()}
          onOpenJoin={vi.fn()}
          onJoinOpenMatch={vi.fn()}
          history={[]}
          openMatches={[]}
          isLoadingHistory={false}
          isLoadingOpenMatches={false}
        />
      );

      expect(screen.getByText(/Friendly Arena/i)).toBeInTheDocument();
      expect(screen.getByText('350')).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: /Create Match/i })[0]).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Join with Code/i })).toBeInTheDocument();
    });

    it('renders open waiting matches with one-click Join action', () => {
      const onJoinOpenMatch = vi.fn();
      render(
        <ArenaLobby
          userBalance={350}
          onOpenCreate={vi.fn()}
          onOpenJoin={vi.fn()}
          onJoinOpenMatch={onJoinOpenMatch}
          history={[]}
          openMatches={[sampleMatch]}
          isLoadingHistory={false}
          isLoadingOpenMatches={false}
        />
      );

      expect(screen.getByText('Alex Developer')).toBeInTheDocument();
      expect(screen.getByText('ARN888')).toBeInTheDocument();

      const joinBtn = screen.getByRole('button', { name: /^Join$/i });
      fireEvent.click(joinBtn);
      expect(onJoinOpenMatch).toHaveBeenCalledWith('ARN888');
    });

    it('renders match history records when switching to History tab', () => {
      render(
        <ArenaLobby
          userBalance={350}
          onOpenCreate={vi.fn()}
          onOpenJoin={vi.fn()}
          onJoinOpenMatch={vi.fn()}
          history={sampleHistory}
          openMatches={[]}
          isLoadingHistory={false}
          isLoadingOpenMatches={false}
        />
      );

      const historyTab = screen.getByRole('button', { name: /Match History/i });
      fireEvent.click(historyTab);

      expect(screen.getByText('vs Sarah Smith')).toBeInTheDocument();
      expect(screen.getByText('75.4 WPM')).toBeInTheDocument();
      expect(screen.getByText('WIN')).toBeInTheDocument();
      expect(screen.getByText('+50')).toBeInTheDocument();
    });
  });

  // ── 2. CreateMatchModal ───────────────────────────────────────────────────
  describe('CreateMatchModal', () => {
    it('disables submit when chosen stake exceeds user balance', () => {
      render(
        <CreateMatchModal
          isOpen={true}
          onClose={vi.fn()}
          onCreated={vi.fn()}
          userBalance={20} // only 20 points
        />
      );

      expect(screen.getByRole('heading', { name: /Create Friendly Match/i })).toBeInTheDocument();

      // Click 50 pts stake preset
      const stake50Btn = screen.getByRole('button', { name: '50 pts' });
      fireEvent.click(stake50Btn);

      const submitBtn = screen.getByRole('button', { name: /Create & Lock 50 pts/i });
      expect(submitBtn).toBeDisabled();
    });

    it('allows creating a zero-stake friendly match regardless of balance', () => {
      render(
        <CreateMatchModal
          isOpen={true}
          onClose={vi.fn()}
          onCreated={vi.fn()}
          userBalance={0}
        />
      );

      const submitBtn = screen.getByRole('button', { name: /Create Friendly Match/i });
      expect(submitBtn).not.toBeDisabled();
    });
  });

  // ── 3. JoinMatchModal ─────────────────────────────────────────────────────
  describe('JoinMatchModal', () => {
    it('automatically uppercases matchCode and enables join when 6 characters entered', () => {
      render(
        <JoinMatchModal
          isOpen={true}
          onClose={vi.fn()}
          onJoined={vi.fn()}
          userBalance={100}
        />
      );

      const input = screen.getByPlaceholderText('e.g. ARN782') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'arn782' } });

      expect(input.value).toBe('ARN782');
      const submitBtn = screen.getByRole('button', { name: /Join Match/i });
      expect(submitBtn).not.toBeDisabled();
    });
  });

  // ── 4. ArenaWaitingRoom ───────────────────────────────────────────────────
  describe('ArenaWaitingRoom', () => {
    it('displays match code and host status with cancel option for creator', () => {
      const onCancel = vi.fn();
      render(
        <ArenaWaitingRoom
          match={sampleMatch}
          currentUserId="user_1"
          onCancel={onCancel}
          onReady={vi.fn()}
        />
      );

      expect(screen.getByText('ARN888')).toBeInTheDocument();
      expect(screen.getByText('Alex Developer')).toBeInTheDocument();
      expect(screen.getByText(/Waiting for opponent to join/i)).toBeInTheDocument();

      const cancelBtn = screen.getByRole('button', { name: /Cancel Match & Refund Stake/i });
      fireEvent.click(cancelBtn);
      expect(onCancel).toHaveBeenCalled();
    });

    it('displays ready button for joined challenger', () => {
      const onReady = vi.fn();
      const matchWithBoth: PublicArenaMatch = {
        ...sampleMatch,
        status: 'READY',
        participants: [
          sampleMatch.participants[0],
          {
            userId: 'user_2',
            name: 'Challenger Bob',
            seat: 2,
            isReady: false,
            isConnected: true,
            progressPercent: 0,
            charsTyped: 0,
            wpm: 0,
            accuracy: 100,
          },
        ],
      };

      render(
        <ArenaWaitingRoom
          match={matchWithBoth}
          currentUserId="user_2"
          onCancel={vi.fn()}
          onReady={onReady}
        />
      );

      const readyBtn = screen.getByRole('button', { name: /I'm Ready!/i });
      fireEvent.click(readyBtn);
      expect(onReady).toHaveBeenCalled();
    });
  });

  // ── 5. ArenaCountdown ─────────────────────────────────────────────────────
  describe('ArenaCountdown', () => {
    it('renders large synchronized countdown seconds', () => {
      render(<ArenaCountdown secondsRemaining={3} />);
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText(/Both Players Ready/i)).toBeInTheDocument();
    });
  });

  // ── 6. ArenaResults ───────────────────────────────────────────────────────
  describe('ArenaResults', () => {
    it('renders victory screen with points settlement and action buttons', () => {
      const finishedMatch: PublicArenaMatch = {
        ...sampleMatch,
        status: 'FINISHED',
        winnerId: 'user_1',
        participants: [
          {
            userId: 'user_1',
            name: 'Alex Developer',
            seat: 1,
            isReady: true,
            isConnected: true,
            progressPercent: 100,
            charsTyped: 150,
            wpm: 84.5,
            accuracy: 99.1,
            completionTimeMs: 25400,
          },
          {
            userId: 'user_2',
            name: 'Challenger Bob',
            seat: 2,
            isReady: true,
            isConnected: true,
            progressPercent: 88,
            charsTyped: 130,
            wpm: 72.0,
            accuracy: 94.0,
            completionTimeMs: null,
          },
        ],
      };

      const onRematch = vi.fn();
      const onReturnToLobby = vi.fn();

      render(
        <ArenaResults
          match={finishedMatch}
          currentUserId="user_1"
          onRematch={onRematch}
          onReturnToLobby={onReturnToLobby}
        />
      );

      expect(screen.getByText('Victory!')).toBeInTheDocument();
      expect(screen.getByText('+50 Arena Points')).toBeInTheDocument();
      expect(screen.getByText('84.5')).toBeInTheDocument();

      const rematchBtn = screen.getByRole('button', { name: /Rematch/i });
      fireEvent.click(rematchBtn);
      expect(onRematch).toHaveBeenCalled();

      const lobbyBtn = screen.getByRole('button', { name: /Return to Arena Lobby/i });
      fireEvent.click(lobbyBtn);
      expect(onReturnToLobby).toHaveBeenCalled();
    });
  });
});
