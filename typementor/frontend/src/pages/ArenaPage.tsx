import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../store/AuthStore';
import { safeFetch } from '../utils/api';
import { arenaSocket, SocketStatus } from '../utils/arenaSocket';
import { PublicArenaMatch, MatchHistoryItem } from '../types/arena';
import { playOpponentJoinedSound, playReadySound, playMatchStartSound } from '../utils/soundEffects';

import { ArenaLobby } from '../components/arena/ArenaLobby';
import { CreateMatchModal } from '../components/arena/CreateMatchModal';
import { JoinMatchModal } from '../components/arena/JoinMatchModal';
import { ArenaWaitingRoom } from '../components/arena/ArenaWaitingRoom';
import { ArenaCountdown } from '../components/arena/ArenaCountdown';
import { ArenaLiveMatch } from '../components/arena/ArenaLiveMatch';
import { ArenaResults } from '../components/arena/ArenaResults';

export const ArenaPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, token, isAuthenticated } = useAuthStore();

  const [activeMatch, setActiveMatch] = useState<PublicArenaMatch | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [history, setHistory] = useState<MatchHistoryItem[]>([]);
  const [openMatches, setOpenMatches] = useState<PublicArenaMatch[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isLoadingOpenMatches, setIsLoadingOpenMatches] = useState(true);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);

  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);
  const [opponentProgress, setOpponentProgress] = useState<any | null>(null);
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const [socketStatus, setSocketStatus] = useState<SocketStatus>('disconnected');

  // Fetch initial user balance
  const fetchBalance = useCallback(async () => {
    if (!token) return;
    try {
      const res = await safeFetch('/api/arena/balance', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance ?? 0);
      }
    } catch (err) {
      console.warn('[Arena] Failed to load balance:', err);
    }
  }, [token]);

  // Fetch open waiting matches
  const fetchOpenMatches = useCallback(async () => {
    if (!token) return;
    setIsLoadingOpenMatches(true);
    try {
      const res = await safeFetch('/api/arena/open', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOpenMatches(data.matches || []);
      }
    } catch (err) {
      console.warn('[Arena] Failed to load open matches:', err);
    } finally {
      setIsLoadingOpenMatches(false);
    }
  }, [token]);

  // Fetch match history
  const fetchHistory = useCallback(async () => {
    if (!token) return;
    setIsLoadingHistory(true);
    try {
      const res = await safeFetch('/api/arena/history', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
      }
    } catch (err) {
      console.warn('[Arena] Failed to load history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [token]);

  // Fetch active/waiting match on load so user is never stuck in lobby
  const fetchActiveMatch = useCallback(async () => {
    if (!token) return;
    try {
      const res = await safeFetch('/api/arena/active', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.match) {
          setActiveMatch(data.match);
          arenaSocket.send('JOIN_MATCH', { matchId: data.match.id });
        }
      }
    } catch (err) {
      console.warn('[Arena] Failed to load active match:', err);
    }
  }, [token]);

  // Connect socket and register listeners
  useEffect(() => {
    if (!token) return;

    arenaSocket.connect(token);
    const unbindStatus = arenaSocket.onStatusChange(setSocketStatus);

    const unbindMatchState = arenaSocket.on('MATCH_STATE', (match: PublicArenaMatch) => {
      setActiveMatch(match);
      if (match.status === 'FINISHED') {
        fetchBalance();
        fetchHistory();
      }
    });

    const unbindOpponentJoined = arenaSocket.on('OPPONENT_JOINED', (data: any) => {
      if (data && data.match) {
        setActiveMatch(data.match);
        playOpponentJoinedSound();
      } else {
        fetchActiveMatch();
      }
    });

    const unbindOpponentReady = arenaSocket.on('OPPONENT_READY', (data: { userId: string }) => {
      playReadySound();
      setActiveMatch((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          participants: prev.participants.map((p) =>
            p.userId === data.userId ? { ...p, isReady: true } : p
          ),
        };
      });
    });

    const unbindCountdown = arenaSocket.on('COUNTDOWN_TICK', (data: { secondsRemaining: number }) => {
      setCountdownSeconds(data.secondsRemaining);
    });

    const unbindMatchStarted = arenaSocket.on('MATCH_STARTED', (data: any) => {
      playMatchStartSound();
      setCountdownSeconds(null);
      setActiveMatch((prev) => (prev ? { ...prev, status: 'ACTIVE', passageText: data.passageText } : null));
    });

    const unbindOpponentProgress = arenaSocket.on('OPPONENT_PROGRESS', (data: any) => {
      setOpponentProgress(data);
    });

    const unbindMatchFinished = arenaSocket.on('MATCH_FINISHED', (match: PublicArenaMatch) => {
      setActiveMatch(match);
      setCountdownSeconds(null);
      fetchBalance();
      fetchHistory();
    });

    const unbindOpponentDisconnected = arenaSocket.on('OPPONENT_DISCONNECTED', () => {
      setOpponentDisconnected(true);
    });

    const unbindOpponentReconnected = arenaSocket.on('OPPONENT_RECONNECTED', () => {
      setOpponentDisconnected(false);
    });

    const unbindCancelled = arenaSocket.on('MATCH_CANCELLED', (data: { reason: string }) => {
      alert(data.reason || 'Match was cancelled.');
      setActiveMatch(null);
      setCountdownSeconds(null);
      fetchBalance();
      fetchOpenMatches();
    });

    return () => {
      unbindStatus();
      unbindMatchState();
      unbindOpponentJoined();
      unbindOpponentReady();
      unbindCountdown();
      unbindMatchStarted();
      unbindOpponentProgress();
      unbindMatchFinished();
      unbindOpponentDisconnected();
      unbindOpponentReconnected();
      unbindCancelled();
      arenaSocket.disconnect();
    };
  }, [token, fetchBalance, fetchHistory, fetchOpenMatches, fetchActiveMatch]);

  // Fail-safe waiting room polling to ensure 100% sync if socket packets drop
  useEffect(() => {
    if (!activeMatch || (activeMatch.status !== 'WAITING' && activeMatch.status !== 'READY')) {
      return;
    }

    const interval = setInterval(() => {
      fetchActiveMatch();
    }, 2500);

    return () => clearInterval(interval);
  }, [activeMatch?.id, activeMatch?.status, fetchActiveMatch]);

  // Initial data loading
  useEffect(() => {
    if (isAuthenticated) {
      fetchBalance();
      fetchOpenMatches();
      fetchHistory();
      fetchActiveMatch();
    }
  }, [isAuthenticated, fetchBalance, fetchOpenMatches, fetchHistory, fetchActiveMatch]);

  // Handle joining a match room via WebSocket
  const enterMatchRoom = (match: PublicArenaMatch) => {
    setActiveMatch(match);
    arenaSocket.send('JOIN_MATCH', { matchId: match.id });
  };

  const handleCancelMatch = async () => {
    if (!activeMatch) return;
    try {
      await safeFetch(`/api/arena/matches/${activeMatch.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      setActiveMatch(null);
      fetchBalance();
      fetchOpenMatches();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel match.');
    }
  };

  const handleReadyUp = () => {
    if (!activeMatch) return;
    arenaSocket.send('READY_UP', { matchId: activeMatch.id });
  };

  const handleJoinOpenMatch = async (matchCode: string) => {
    try {
      const res = await safeFetch('/api/arena/matches/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ matchCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      enterMatchRoom(data.match);
    } catch (err: any) {
      alert(err.message || 'Unable to join match');
    }
  };

  const handleReturnToLobby = () => {
    if (activeMatch) {
      arenaSocket.send('LEAVE_MATCH', { matchId: activeMatch.id });
    }
    setActiveMatch(null);
    setOpponentProgress(null);
    setCountdownSeconds(null);
    fetchBalance();
    fetchOpenMatches();
    fetchHistory();
  };

  // Determine current screen view
  const currentUserId = user?.id || '';

  return (
    <div className="min-h-[85vh] py-6 px-4 sm:px-6 flex flex-col justify-center">
      {/* 1. Countdown Overlay */}
      {countdownSeconds !== null && countdownSeconds > 0 && (
        <ArenaCountdown secondsRemaining={countdownSeconds} />
      )}

      {/* 2. Main Dynamic Views */}
      {!activeMatch ? (
        <div className="max-w-4xl mx-auto w-full space-y-4">
          <div>
            <button
              onClick={() => navigate('/arena')}
              className="inline-flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg bg-zinc-900/50 border border-zinc-800"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Arena Hub</span>
            </button>
          </div>
          <ArenaLobby
            userBalance={balance}
            onOpenCreate={() => setIsCreateOpen(true)}
            onOpenJoin={() => setIsJoinOpen(true)}
            onJoinOpenMatch={handleJoinOpenMatch}
            history={history}
            openMatches={openMatches}
            isLoadingHistory={isLoadingHistory}
            isLoadingOpenMatches={isLoadingOpenMatches}
            socketStatus={socketStatus}
          />
        </div>
      ) : activeMatch.status === 'FINISHED' ? (
        <ArenaResults
          match={activeMatch}
          currentUserId={currentUserId}
          opponentProgress={opponentProgress}
          onRematch={() => setIsCreateOpen(true)}
          onReturnToLobby={handleReturnToLobby}
        />
      ) : activeMatch.status === 'ACTIVE' ? (
        <ArenaLiveMatch
          match={activeMatch}
          currentUserId={currentUserId}
          opponentProgress={opponentProgress}
          opponentDisconnected={opponentDisconnected}
          onFinishSubmitted={() => {}}
        />
      ) : (
        <ArenaWaitingRoom
          match={activeMatch}
          currentUserId={currentUserId}
          onCancel={handleCancelMatch}
          onReady={handleReadyUp}
        />
      )}

      {/* Modals */}
      <CreateMatchModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={enterMatchRoom}
        userBalance={balance}
      />

      <JoinMatchModal
        isOpen={isJoinOpen}
        onClose={() => setIsJoinOpen(false)}
        onJoined={enterMatchRoom}
        userBalance={balance}
      />
    </div>
  );
};

export default ArenaPage;
