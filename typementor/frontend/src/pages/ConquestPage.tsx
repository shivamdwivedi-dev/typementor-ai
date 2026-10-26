import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Swords, Crown, AlertTriangle, Radio, HelpCircle } from 'lucide-react';
import { useAuthStore } from '../store/AuthStore';
import { safeFetch } from '../utils/api';
import { conquestSocket, SocketStatus } from '../utils/conquestSocket';
import {
  PublicConquestMatch,
  PlayerSlot,
  TerritoryCell,
  ActiveAttackChallenge,
} from '../types/conquest';

import { ConquestLobby } from '../components/conquest/ConquestLobby';
import { ConquestWaitingRoom } from '../components/conquest/ConquestWaitingRoom';
import { ConquestGrid } from '../components/conquest/ConquestGrid';
import { ConquestCombatPanel } from '../components/conquest/ConquestCombatPanel';
import { ConquestResultsModal } from '../components/conquest/ConquestResultsModal';
import {
  ConquestIncomingAttackAlert,
  IncomingAttackInfo,
} from '../components/conquest/ConquestIncomingAttackAlert';
import { ConquestLegend } from '../components/conquest/ConquestLegend';
import { ConquestTutorialModal } from '../components/conquest/ConquestTutorialModal';
import {
  ConquestEventFeed,
  ConquestFeedItem,
  ConquestFeedEventType,
} from '../components/conquest/ConquestEventFeed';

export const ConquestPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, token } = useAuthStore();

  const [activeMatch, setActiveMatch] = useState<PublicConquestMatch | null>(null);
  const [socketStatus, setSocketStatus] = useState<SocketStatus>('disconnected');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [challengeError, setChallengeError] = useState<string | null>(null);

  // Live match state
  const [activeChallenge, setActiveChallenge] = useState<ActiveAttackChallenge | null>(null);
  const [opponentAttackingCellKey, setOpponentAttackingCellKey] = useState<string | null>(null);
  const [incomingAttack, setIncomingAttack] = useState<IncomingAttackInfo | null>(null);
  const [selectedCell, setSelectedCell] = useState<TerritoryCell | null>(null);
  const [opponentDisconnected, setOpponentDisconnected] = useState<boolean>(false);
  const [disconnectSecondsLeft, setDisconnectSecondsLeft] = useState<number>(30);
  const [finishReason, setFinishReason] = useState<string | null>(null);

  // Tutorial modal state
  const [isTutorialOpen, setIsTutorialOpen] = useState<boolean>(false);

  // Event feed state & deduplication ref
  const [eventFeed, setEventFeed] = useState<ConquestFeedItem[]>([]);
  const processedEventKeysRef = useRef<Set<string>>(new Set());

  // Mutable refs to access freshest state without re-triggering socket listener effects
  const activeMatchRef = useRef<PublicConquestMatch | null>(null);
  activeMatchRef.current = activeMatch;

  const activeChallengeRef = useRef<ActiveAttackChallenge | null>(null);
  activeChallengeRef.current = activeChallenge;

  const currentUserId = user?.id || '';
  const currentUserIdRef = useRef<string>(currentUserId);
  currentUserIdRef.current = currentUserId;

  // Determine current user's slot (1 = Blue, 2 = Red)
  const myPlayerSlot = useMemo<PlayerSlot | null>(() => {
    if (!activeMatch || !currentUserId) return null;
    const participant = activeMatch.participants.find((p) => p.userId === currentUserId);
    return (participant?.seat as PlayerSlot) || null;
  }, [activeMatch, currentUserId]);

  const myPlayerSlotRef = useRef<PlayerSlot | null>(myPlayerSlot);
  myPlayerSlotRef.current = myPlayerSlot;

  const p1 = activeMatch?.participants.find((p) => p.seat === 1);
  const p2 = activeMatch?.participants.find((p) => p.seat === 2);

  // Authoritatively compute territory counts directly from the board cells
  const { p1TerritoriesCount, p2TerritoriesCount } = useMemo(() => {
    let count1 = 0;
    let count2 = 0;
    if (activeMatch?.board?.cells) {
      for (const cell of activeMatch.board.cells) {
        if (cell.owner === 1) count1++;
        else if (cell.owner === 2) count2++;
      }
    }
    return {
      p1TerritoriesCount: Math.max(1, count1),
      p2TerritoriesCount: Math.max(1, count2),
    };
  }, [activeMatch?.board?.cells]);

  // Compute legal candidate cell keys for the current player
  const candidateCellKeys = useMemo<Set<string>>(() => {
    if (
      !myPlayerSlot ||
      activeMatch?.status !== 'ACTIVE' ||
      activeChallenge !== null ||
      !activeMatch?.board
    ) {
      return new Set<string>();
    }

    const ownedCoords: { row: number; col: number }[] = [];
    for (const cell of activeMatch.board.cells) {
      if (cell.owner === myPlayerSlot) {
        ownedCoords.push({ row: cell.row, col: cell.col });
      }
    }

    const candidates = new Set<string>();
    const deltas = [
      [-1, 0], // North
      [1, 0], // South
      [0, -1], // West
      [0, 1], // East
    ];

    for (const { row, col } of ownedCoords) {
      for (const [dr, dc] of deltas) {
        const nr = row + dr;
        const nc = col + dc;
        if (nr >= 0 && nr < 6 && nc >= 0 && nc < 6) {
          const key = `r${nr}_c${nc}`;
          const neighbor = activeMatch.board.cellMap[key];
          if (neighbor && neighbor.owner !== myPlayerSlot) {
            candidates.add(key);
          }
        }
      }
    }

    return candidates;
  }, [activeMatch, myPlayerSlot, activeChallenge]);

  // Helper to add authoritative feed items with robust deduplication
  const addFeedItem = useCallback(
    (
      type: ConquestFeedEventType,
      title: string,
      description: string,
      isSelf?: boolean,
      dedupeKey?: string
    ) => {
      const key =
        dedupeKey ||
        `${type}_${title}_${description}_${Math.floor(Date.now() / 2000)}`;

      if (processedEventKeysRef.current.has(key)) {
        return;
      }
      processedEventKeysRef.current.add(key);

      // Keep dedupe set bounded to avoid memory accumulation
      if (processedEventKeysRef.current.size > 100) {
        const arr = Array.from(processedEventKeysRef.current);
        processedEventKeysRef.current = new Set(arr.slice(-50));
      }

      const newItem: ConquestFeedItem = {
        id: dedupeKey || `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type,
        title,
        description,
        timestamp: Date.now(),
        isSelf,
      };
      setEventFeed((prev) => [...prev.slice(-15), newItem]);
    },
    []
  );

  // Check user's active/waiting match on load
  const fetchActiveMatch = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await safeFetch('/api/conquest/active', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (
          data &&
          data.match &&
          data.match.status !== 'FINISHED' &&
          data.match.status !== 'CANCELLED'
        ) {
          setActiveMatch(data.match);
          setActiveChallenge(data.match.activeChallenge || null);
          conquestSocket.send('CONQUEST_JOIN_ROOM', { matchId: data.match.id });
        }
      }
    } catch (err: any) {
      console.warn('[ConquestPage] Failed to fetch active match:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // Connect socket and register listeners once per authenticated session
  useEffect(() => {
    if (!token) return;

    conquestSocket.connect(token);
    (window as any).__conquestSocket = conquestSocket;
    const unbindStatus = conquestSocket.onStatusChange(setSocketStatus);

    fetchActiveMatch();

    // 1. Room joined & state hydration
    const unbindRoomJoined = conquestSocket.on('CONQUEST_ROOM_JOINED', (payload: any) => {
      if (payload && payload.match) {
        setActiveMatch(payload.match);
        setActiveChallenge(payload.match.activeChallenge || null);
      }
    });

    // 2. Player ready
    const unbindPlayerReady = conquestSocket.on('CONQUEST_PLAYER_READY', (payload: any) => {
      setActiveMatch((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          participants: prev.participants.map((p) =>
            p.userId === payload.userId ? { ...p, isReady: true } : p
          ),
        };
      });
    });

    // 3. Match started
    const unbindMatchStarted = conquestSocket.on('CONQUEST_MATCH_STARTED', (payload: any) => {
      setActiveMatch((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          status: 'ACTIVE',
          startedAt: payload.startedAt,
          board: payload.board || prev.board,
        };
      });
      setActiveChallenge(null);
      setOpponentAttackingCellKey(null);
      setIncomingAttack(null);
      addFeedItem(
        'ATTACK_STARTED',
        'Battlefield Engaged',
        '6×6 realm is live. Advance your commanders!',
        false,
        `MATCH_START_${payload.matchId || Date.now()}`
      );
    });

    // 4. Attack assigned to current user
    const unbindAttackAssigned = conquestSocket.on('CONQUEST_ATTACK_ASSIGNED', (payload: any) => {
      if (payload && payload.challenge) {
        setActiveChallenge(payload.challenge);
        setChallengeError(null);
        addFeedItem(
          'ATTACK_STARTED',
          `Assault Launched: ${payload.challenge.targetCellKey}`,
          `Targeting (${payload.challenge.targetCellKey}) — Req: ${payload.challenge.minAccuracy}% acc`,
          true,
          `ATTACK_${payload.challenge.challengeId}`
        );
      }
    });

    // 5. Opponent attack started
    const unbindOpponentAttackStarted = conquestSocket.on(
      'CONQUEST_OPPONENT_ATTACK_STARTED',
      (payload: any) => {
        if (!payload || !payload.targetCellKey) return;
        setOpponentAttackingCellKey(payload.targetCellKey);

        const curr = activeMatchRef.current;
        const targetCell = curr?.board?.cellMap?.[payload.targetCellKey];
        const attacker = curr?.participants.find((p) => p.userId === payload.userId);
        const attackerName = attacker?.user.name || 'Opponent';

        const mySlot = myPlayerSlotRef.current;
        const isMyTerritory = targetCell && mySlot !== null && targetCell.owner === mySlot;
        const isMyCapital =
          targetCell?.type === 'CAPITAL' &&
          ((mySlot === 1 && payload.targetCellKey === 'r0_c0') ||
            (mySlot === 2 && payload.targetCellKey === 'r5_c5'));

        // Only display high-priority incoming alert if it targets OUR territory
        if (targetCell && isMyTerritory) {
          setIncomingAttack({
            attackerUserId: payload.userId,
            attackerName,
            targetCellKey: payload.targetCellKey,
            targetCell,
            isMyCapital: !!isMyCapital,
            defenseModifier: payload.defenseModifier || 0,
            startedAt: Date.now(),
            charsTyped: 0,
          });
        }

        const dedupeKey = payload.challengeId
          ? `OPP_ATTACK_${payload.challengeId}`
          : `OPP_ATTACK_${payload.targetCellKey}_${payload.userId}_${Math.floor(Date.now() / 2000)}`;

        addFeedItem(
          'OPPONENT_ATTACK_STARTED',
          isMyTerritory
            ? `⚠️ Incoming Attack on ${targetCell?.name || payload.targetCellKey}!`
            : `Opponent contesting ${targetCell?.name || payload.targetCellKey}`,
          `${attackerName} is assaulting (${targetCell?.row ?? '?'}, ${targetCell?.col ?? '?'})`,
          false,
          dedupeKey
        );
      }
    );

    // 6. Opponent progress telemetry
    const unbindOpponentProgress = conquestSocket.on(
      'CONQUEST_OPPONENT_PROGRESS',
      (payload: any) => {
        if (payload && payload.userId !== currentUserIdRef.current) {
          setIncomingAttack((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              charsTyped: payload.charsTyped ?? prev.charsTyped,
            };
          });
        }
      }
    );

    // 7. Territory captured
    const unbindTerritoryCaptured = conquestSocket.on(
      'CONQUEST_TERRITORY_CAPTURED',
      (payload: any) => {
        const isMine = payload.capturedBy === currentUserIdRef.current;

        // If current user was contesting this exact cell and lost the race
        if (
          activeChallengeRef.current &&
          activeChallengeRef.current.targetCellKey === payload.cellKey &&
          !isMine
        ) {
          addFeedItem(
            'ATTACK_FAILED',
            'Contested Assault Lost',
            `Opponent completed the challenge for ${payload.cellKey} first!`,
            true,
            `CONTESTED_LOST_${payload.cellKey}_${Date.now()}`
          );
          setChallengeError('Opponent completed the challenge for this territory first.');
        }

        setActiveMatch((prev) => {
          if (!prev) return prev;
          const newBoard = payload.board || prev.board;
          return {
            ...prev,
            board: newBoard,
          };
        });

        // Re-sync selected cell to updated board data
        setSelectedCell((prevSelected) => {
          if (!prevSelected || prevSelected.id !== payload.cellKey) return prevSelected;
          return payload.board?.cellMap?.[payload.cellKey] || prevSelected;
        });

        addFeedItem(
          'TERRITORY_CAPTURED',
          isMine ? '🎉 Territory Captured!' : 'Enemy Captured Territory!',
          `Tile ${payload.cellKey} claimed at ${payload.wpm} WPM (${payload.accuracy}% acc)`,
          isMine,
          `CAPTURE_${payload.cellKey}_${payload.capturedBy}`
        );

        // If this was our challenge, clear it
        setActiveChallenge(null);
        setChallengeError(null);

        // Clear opponent alert if targeted territory was captured
        setOpponentAttackingCellKey(null);
        setIncomingAttack(null);
      }
    );

    // 8. Attack failed
    const unbindAttackFailed = conquestSocket.on('CONQUEST_ATTACK_FAILED', (payload: any) => {
      const reason = payload?.reason || 'Attack submission failed.';
      setChallengeError(reason);
      setActiveChallenge(null);
      addFeedItem(
        'ATTACK_FAILED',
        'Assault Failed',
        reason,
        true,
        `FAIL_${payload?.challengeId || Date.now()}`
      );
    });

    // 9. Opponent disconnected
    const unbindPlayerDisconnected = conquestSocket.on(
      'CONQUEST_PLAYER_DISCONNECTED',
      (payload: any) => {
        if (payload.userId !== currentUserIdRef.current) {
          setOpponentDisconnected(true);
          setDisconnectSecondsLeft(payload.gracePeriodSeconds || 30);
          addFeedItem(
            'PLAYER_DISCONNECTED',
            'Opponent Disconnected',
            '30-second reconnection grace period active.',
            false,
            `DISCONNECT_${payload.userId}_${Date.now()}`
          );
        }
      }
    );

    // 10. Opponent reconnected
    const unbindPlayerReconnected = conquestSocket.on(
      'CONQUEST_PLAYER_RECONNECTED',
      (payload: any) => {
        if (payload.userId !== currentUserIdRef.current) {
          setOpponentDisconnected(false);
          addFeedItem(
            'PLAYER_RECONNECTED',
            'Opponent Reconnected',
            'Opponent returned to the war room.',
            false,
            `RECONNECT_${payload.userId}_${Date.now()}`
          );
        }
      }
    );

    // 11. Match finished
    const unbindMatchFinished = conquestSocket.on('CONQUEST_MATCH_FINISHED', (payload: any) => {
      setActiveMatch((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          status: 'FINISHED',
          winnerId: payload.winnerId,
          finishedAt: payload.finishedAt,
        };
      });
      setFinishReason(payload.reason || 'CAPITAL_CAPTURED');
      setActiveChallenge(null);
      setOpponentAttackingCellKey(null);
      setIncomingAttack(null);
      setOpponentDisconnected(false);

      const isWinner = payload.winnerId === currentUserIdRef.current;
      addFeedItem(
        'MATCH_FINISHED',
        isWinner ? '🏆 VICTORY!' : 'DEFEAT',
        payload.reason === 'CAPITAL_CAPTURED'
          ? 'Enemy Capital Citadel was captured.'
          : 'Match concluded via disconnect forfeit.',
        isWinner,
        `FINISH_${payload.matchId}_${payload.winnerId}`
      );
    });

    // 12. Socket errors
    const unbindError = conquestSocket.on('CONQUEST_ERROR', (payload: any) => {
      setActionError(payload?.message || 'Word Conquest error occurred.');
    });

    return () => {
      unbindStatus();
      unbindRoomJoined();
      unbindPlayerReady();
      unbindMatchStarted();
      unbindAttackAssigned();
      unbindOpponentAttackStarted();
      unbindOpponentProgress();
      unbindTerritoryCaptured();
      unbindAttackFailed();
      unbindPlayerDisconnected();
      unbindPlayerReconnected();
      unbindMatchFinished();
      unbindError();
    };
  }, [token, fetchActiveMatch, addFeedItem]);

  // Disconnect timer countdown effect
  useEffect(() => {
    if (!opponentDisconnected) return;
    const interval = setInterval(() => {
      setDisconnectSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [opponentDisconnected]);

  // Create match action
  const handleCreateMatch = async () => {
    if (!token) return;
    setActionError(null);
    setIsLoading(true);
    try {
      const res = await safeFetch('/api/conquest/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to create match');
      }

      const match: PublicConquestMatch = await res.json();
      setActiveMatch(match);
      conquestSocket.send('CONQUEST_JOIN_ROOM', { matchId: match.id });
    } catch (err: any) {
      setActionError(err.message || 'Failed to create Word Conquest match');
    } finally {
      setIsLoading(false);
    }
  };

  // Join match action
  const handleJoinMatch = async (matchCode: string) => {
    if (!token) return;
    setActionError(null);
    setIsLoading(true);
    try {
      const res = await safeFetch('/api/conquest/matches/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ matchCode }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to join match');
      }

      const match: PublicConquestMatch = await res.json();
      setActiveMatch(match);
      conquestSocket.send('CONQUEST_JOIN_ROOM', { matchId: match.id });
    } catch (err: any) {
      setActionError(err.message || 'Failed to join Word Conquest match');
    } finally {
      setIsLoading(false);
    }
  };

  // Ready action in waiting room
  const handleReady = () => {
    if (!activeMatch) return;
    conquestSocket.send('CONQUEST_READY', { matchId: activeMatch.id });
  };

  // Cancel waiting match
  const handleCancelMatch = async () => {
    if (!activeMatch || !token) return;
    try {
      await safeFetch(`/api/conquest/matches/${activeMatch.id}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setActiveMatch(null);
      setActiveChallenge(null);
    } catch (err: any) {
      console.warn('[ConquestPage] Cancel match error:', err);
    }
  };

  // Click cell on tactical map to attack
  const handleCellClick = (cell: TerritoryCell) => {
    if (!activeMatch || activeMatch.status !== 'ACTIVE' || activeChallenge !== null) return;
    setActionError(null);
    setChallengeError(null);

    conquestSocket.send('CONQUEST_ATTACK_START', {
      matchId: activeMatch.id,
      targetRow: cell.row,
      targetCol: cell.col,
    });
  };

  // Typing progress update during active assault
  const handleAttackProgress = (charsTyped: number) => {
    if (!activeMatch) return;
    conquestSocket.send('CONQUEST_ATTACK_PROGRESS', {
      matchId: activeMatch.id,
      charsTyped,
    });
  };

  // Submit typed challenge to capture territory
  const handleChallengeSubmit = (submittedText: string) => {
    if (!activeMatch || !activeChallenge) return;
    conquestSocket.send('CONQUEST_CHALLENGE_SUBMIT', {
      matchId: activeMatch.id,
      challengeId: activeChallenge.challengeId,
      submittedText,
    });
  };

  // DEFEND NOW action from incoming attack alert
  const handleDefendNow = () => {
    if (activeChallenge) {
      // Player already has an active attack challenge -> focus typing drawer
      const panel = document.getElementById('conquest-combat-panel');
      if (panel) {
        panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      (window as any).__conquestFocusInput?.();
    } else {
      // Player has no active attack -> scroll to tactical map to counter-attack!
      const mapEl = document.getElementById('conquest-tactical-map');
      if (mapEl) {
        mapEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      // If there are legal candidates, auto-select the first candidate in guidance panel
      if (candidateCellKeys.size > 0 && activeMatch?.board) {
        const firstKey = Array.from(candidateCellKeys)[0];
        const cell = activeMatch.board.cellMap[firstKey];
        if (cell) {
          setSelectedCell(cell);
        }
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto w-full py-6 px-4 sm:px-6 space-y-6 animate-in fade-in duration-300">
      {/* Top Navigation & Status Bar */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => navigate('/arena')}
          className="inline-flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg bg-zinc-900/50 border border-zinc-800"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit to Arena Hub</span>
        </button>

        {/* Center/Right: How to Play Tutorial & WebSocket Pill */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsTutorialOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold transition-all shadow-sm"
          >
            <HelpCircle className="w-3.5 h-3.5 text-purple-400" />
            <span>How to Play</span>
          </button>

          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${
              socketStatus === 'connected'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}
          >
            <Radio className={`w-3 h-3 ${socketStatus === 'connected' ? 'animate-pulse' : ''}`} />
            <span>{socketStatus}</span>
          </div>
        </div>
      </div>

      {/* Opponent Disconnect Warning Banner */}
      {opponentDisconnected && (
        <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs flex items-center justify-between gap-3 shadow-lg shadow-amber-500/10 animate-pulse">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="font-bold">Opponent Disconnected!</p>
              <p className="text-amber-400/80 text-[11px]">
                Waiting for reconnection. Match will be awarded as forfeit win if they do not
                return.
              </p>
            </div>
          </div>
          <div className="font-mono font-black text-lg text-amber-300 px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-500/30">
            {disconnectSecondsLeft}s
          </div>
        </div>
      )}

      {/* Prominent Real-Time Incoming Attack Alert (Displayed ONLY when player territory is targeted) */}
      {incomingAttack && (
        <ConquestIncomingAttackAlert
          attack={incomingAttack}
          activeChallenge={activeChallenge}
          onDefendNow={handleDefendNow}
        />
      )}

      {/* Global Action Error Alert */}
      {actionError && (
        <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="text-xs hover:underline ml-2">
            Dismiss
          </button>
        </div>
      )}

      {/* VIEW 1: No active match -> Conquest Lobby */}
      {!activeMatch && (
        <ConquestLobby
          onCreateMatch={handleCreateMatch}
          onJoinMatch={handleJoinMatch}
          onOpenTutorial={() => setIsTutorialOpen(true)}
          isSubmitting={isLoading}
          error={actionError}
        />
      )}

      {/* VIEW 2: Match in WAITING or READY state -> Waiting Room */}
      {activeMatch &&
        (activeMatch.status === 'WAITING' || activeMatch.status === 'READY') && (
          <ConquestWaitingRoom
            match={activeMatch}
            currentUserId={currentUserId}
            onReady={handleReady}
            onCancel={handleCancelMatch}
            onOpenTutorial={() => setIsTutorialOpen(true)}
            isReady={
              activeMatch.participants.find((p) => p.userId === currentUserId)?.isReady ?? false
            }
          />
        )}

      {/* VIEW 3: Active Battle Mode */}
      {activeMatch && activeMatch.status === 'ACTIVE' && (
        <div className="space-y-6">
          {/* Tactical Match HUD: Authoritative Faction Cards & Territory Totals */}
          <div className="p-4 sm:p-5 rounded-3xl bg-zinc-950/80 border border-zinc-800 shadow-xl backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Player 1 Citadel Card (Blue) */}
            <div
              className={`w-full md:w-auto p-3.5 rounded-2xl border flex items-center justify-between md:justify-start gap-4 transition-all ${
                myPlayerSlot === 1
                  ? 'bg-blue-950/60 border-blue-500/60 shadow-lg shadow-blue-500/10'
                  : 'bg-zinc-900/60 border-zinc-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">
                    {p1?.user.name || 'Commander 1'} {myPlayerSlot === 1 && '(You)'}
                  </span>
                  <span className="text-[10px] text-blue-400 font-mono">Blue Citadel (0,0)</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[9px] uppercase font-bold text-zinc-500 block">
                  Territories
                </span>
                <span className="text-xl font-black font-mono text-blue-300">
                  {p1TerritoriesCount}
                </span>
              </div>
            </div>

            {/* Center Match Code & Versus Badge */}
            <div className="flex items-center gap-3 text-center">
              <div className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 font-mono text-xs font-bold text-zinc-300">
                Code: <span className="text-purple-400">{activeMatch.matchCode}</span>
              </div>
              <div className="p-2 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30">
                <Swords className="w-4 h-4" />
              </div>
            </div>

            {/* Player 2 Citadel Card (Red) */}
            <div
              className={`w-full md:w-auto p-3.5 rounded-2xl border flex items-center justify-between md:justify-start gap-4 transition-all ${
                myPlayerSlot === 2
                  ? 'bg-rose-950/60 border-rose-500/60 shadow-lg shadow-rose-500/10'
                  : 'bg-zinc-900/60 border-zinc-800'
              }`}
            >
              <div className="text-left md:text-right order-2 md:order-1">
                <span className="text-[9px] uppercase font-bold text-zinc-500 block">
                  Territories
                </span>
                <span className="text-xl font-black font-mono text-rose-300">
                  {p2TerritoriesCount}
                </span>
              </div>
              <div className="flex items-center gap-2.5 order-1 md:order-2">
                <div>
                  <span className="text-xs font-bold text-white block">
                    {p2?.user.name || 'Commander 2'} {myPlayerSlot === 2 && '(You)'}
                  </span>
                  <span className="text-[10px] text-rose-400 font-mono">Red Citadel (5,5)</span>
                </div>
                <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
                  <Crown className="w-5 h-5" />
                </div>
              </div>
            </div>
          </div>

          {/* Active Typing Assault Panel (if an attack is currently in flight) */}
          {activeChallenge && (
            <ConquestCombatPanel
              challenge={activeChallenge}
              onSubmit={handleChallengeSubmit}
              onProgress={handleAttackProgress}
              errorReason={challengeError}
            />
          )}

          {/* Tactical 6x6 Realm Battlefield */}
          <div id="conquest-tactical-map" className="space-y-4">
            <div className="text-center">
              <h3 className="text-sm font-bold text-zinc-300 flex items-center justify-center gap-1.5">
                <span>Tactical Map</span>
                <span className="text-zinc-500 text-xs font-normal">
                  — Click adjacent territory to launch assault
                </span>
              </h3>
            </div>

            <ConquestGrid
              board={activeMatch.board}
              myPlayerSlot={myPlayerSlot}
              activeChallenge={activeChallenge}
              opponentAttackingCellKey={opponentAttackingCellKey}
              selectedCell={selectedCell}
              onCellClick={handleCellClick}
              onSelectCell={setSelectedCell}
              disabled={activeChallenge !== null}
            />

            {/* Battlefield Legend & Contextual Guidance Inspector */}
            <ConquestLegend
              myPlayerSlot={myPlayerSlot}
              selectedCell={selectedCell}
              candidateCellKeys={candidateCellKeys}
              activeChallenge={activeChallenge}
              opponentAttackingCellKey={opponentAttackingCellKey}
              onOpenTutorial={() => setIsTutorialOpen(true)}
            />

            {/* Tactical Live Feed (Real Server Events with Deduplication) */}
            <ConquestEventFeed events={eventFeed} />
          </div>
        </div>
      )}

      {/* VIEW 4: Match Finished -> Results Celebration Modal */}
      {activeMatch && activeMatch.status === 'FINISHED' && (
        <ConquestResultsModal
          match={activeMatch}
          currentUserId={currentUserId}
          reason={finishReason}
          onReturnToHub={() => {
            setActiveMatch(null);
            navigate('/arena');
          }}
          onNewMatch={() => {
            setActiveMatch(null);
            handleCreateMatch();
          }}
        />
      )}

      {/* First-Time Interactive Tutorial Modal */}
      <ConquestTutorialModal
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
      />
    </div>
  );
};

export default ConquestPage;
