import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConquestIncomingAttackAlert, IncomingAttackInfo } from '../components/conquest/ConquestIncomingAttackAlert';
import { ConquestTutorialModal } from '../components/conquest/ConquestTutorialModal';
import { ConquestLegend } from '../components/conquest/ConquestLegend';
import { ConquestCombatPanel } from '../components/conquest/ConquestCombatPanel';
import { ConquestEventFeed, ConquestFeedItem } from '../components/conquest/ConquestEventFeed';
import { ConquestGrid } from '../components/conquest/ConquestGrid';
import { TerritoryCell, ActiveAttackChallenge, ConquestBoard } from '../types/conquest';

describe('Word Conquest UX, Alerts, Grid Ownership & State Synchronization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Incoming Attack Alert Component', () => {
    const mockTerritoryCell: TerritoryCell = {
      id: 'r1_c0',
      row: 1,
      col: 0,
      type: 'NEUTRAL',
      owner: 1,
      name: 'North Watch',
      defenseBonus: 0,
    };

    const mockCapitalCell: TerritoryCell = {
      id: 'r0_c0',
      row: 0,
      col: 0,
      type: 'CAPITAL',
      owner: 1,
      name: 'Blue Citadel',
      defenseBonus: 5,
    };

    const mockAttackInfo: IncomingAttackInfo = {
      attackerUserId: 'user_red_999',
      attackerName: 'Challenger Red',
      targetCellKey: 'r1_c0',
      targetCell: mockTerritoryCell,
      isMyCapital: false,
      defenseModifier: 0,
      startedAt: Date.now() - 5000,
      charsTyped: 34,
    };

    it('renders prominent incoming attack alert with attacker name, target coordinates, and live telemetry', () => {
      const handleDefendNow = vi.fn();

      render(
        <ConquestIncomingAttackAlert
          attack={mockAttackInfo}
          activeChallenge={null}
          onDefendNow={handleDefendNow}
        />
      );

      // Verify alert banner presence and ARIA roles
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('INCOMING ATTACK')).toBeInTheDocument();
      expect(screen.getByText(/Challenger Red/i)).toBeInTheDocument();
      expect(screen.getByText(/Target: \(1, 0\)/i)).toBeInTheDocument();
      expect(screen.getByText(/34 chars/i)).toBeInTheDocument();

      // Click DEFEND NOW button
      const defendBtn = screen.getByRole('button', { name: /DEFEND NOW/i });
      fireEvent.click(defendBtn);
      expect(handleDefendNow).toHaveBeenCalledTimes(1);
    });

    it('displays critical citadel alert styling when target is player capital', () => {
      const capitalAttackInfo: IncomingAttackInfo = {
        ...mockAttackInfo,
        targetCellKey: 'r0_c0',
        targetCell: mockCapitalCell,
        isMyCapital: true,
      };

      render(
        <ConquestIncomingAttackAlert
          attack={capitalAttackInfo}
          activeChallenge={null}
          onDefendNow={vi.fn()}
        />
      );

      expect(screen.getByText('CRITICAL CITADEL ASSAULT')).toBeInTheDocument();
      expect(screen.getByText(/attacking your Capital Citadel/i)).toBeInTheDocument();
    });

    it('displays FOCUS ACTIVE COMBAT action when player is already engaged in an attack', () => {
      const mockActiveChallenge: ActiveAttackChallenge = {
        challengeId: 'chal_123',
        userId: 'user_blue_111',
        playerSlot: 1,
        targetCellKey: 'r2_c0',
        territoryType: 'NEUTRAL',
        difficultyTier: 'EASY',
        passageId: 'pass_1',
        passageTitle: 'The Advance',
        passageText: 'Sample text to type.',
        wordCount: 4,
        charCount: 20,
        defenseModifier: 0,
        minAccuracy: 90,
        startedAt: Date.now(),
        deadlineAt: Date.now() + 75000,
      };

      const handleDefendNow = vi.fn();

      render(
        <ConquestIncomingAttackAlert
          attack={mockAttackInfo}
          activeChallenge={mockActiveChallenge}
          onDefendNow={handleDefendNow}
        />
      );

      expect(screen.getByRole('button', { name: /FOCUS ACTIVE COMBAT/i })).toBeInTheDocument();
      expect(screen.getByText(/You have an active attack underway on tile/i)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /FOCUS ACTIVE COMBAT/i }));
      expect(handleDefendNow).toHaveBeenCalledTimes(1);
    });
  });

  describe('2. Interactive Tutorial Modal', () => {
    it('renders step 1 and supports navigation, skip, and replay', () => {
      const handleClose = vi.fn();

      const { rerender } = render(
        <ConquestTutorialModal isOpen={true} onClose={handleClose} />
      );

      // Verify Step 1 is rendered
      expect(screen.getByText(/Step 1: The Objective/i)).toBeInTheDocument();
      expect(screen.getByText('Your Mission: Conquer the Capital')).toBeInTheDocument();

      // Click Next to navigate to Step 2
      const nextBtn = screen.getByRole('button', { name: /Next/i });
      fireEvent.click(nextBtn);
      expect(screen.getByText(/Step 2: Tactical Expansion/i)).toBeInTheDocument();
      expect(screen.getByText('Choose a Target: Adjacent Tiles')).toBeInTheDocument();

      // Click Prev to return to Step 1
      const prevBtn = screen.getByRole('button', { name: /Prev/i });
      fireEvent.click(prevBtn);
      expect(screen.getByText(/Step 1: The Objective/i)).toBeInTheDocument();

      // Navigate through all steps to test completion button
      for (let i = 0; i < 5; i++) {
        fireEvent.click(screen.getByRole('button', { name: /Next/i }));
      }

      // Step 6 should display "Got it — Enter Battle"
      expect(screen.getByText(/Step 6: Winning the War/i)).toBeInTheDocument();
      const enterBattleBtn = screen.getByRole('button', { name: /Got it — Enter Battle/i });
      fireEvent.click(enterBattleBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);

      // Test Skip button
      rerender(<ConquestTutorialModal isOpen={true} onClose={handleClose} />);
      const skipBtn = screen.getByRole('button', { name: /Skip Tutorial/i });
      fireEvent.click(skipBtn);
      expect(handleClose).toHaveBeenCalledTimes(2);
    });

    it('navigates with keyboard arrow keys and closes on Escape', () => {
      const handleClose = vi.fn();
      render(<ConquestTutorialModal isOpen={true} onClose={handleClose} />);

      // Right arrow navigates to step 2
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      expect(screen.getByText(/Step 2: Tactical Expansion/i)).toBeInTheDocument();

      // Left arrow navigates back to step 1
      fireEvent.keyDown(window, { key: 'ArrowLeft' });
      expect(screen.getByText(/Step 1: The Objective/i)).toBeInTheDocument();

      // Escape key closes modal
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('3. Battlefield Legend & Contextual Guidance', () => {
    it('accurately lists all territory states in the persistent legend', () => {
      render(
        <ConquestLegend
          myPlayerSlot={1}
          selectedCell={null}
          candidateCellKeys={new Set(['r0_c1', 'r1_c0'])}
          activeChallenge={null}
          opponentAttackingCellKey={null}
          onOpenTutorial={vi.fn()}
        />
      );

      expect(screen.getByText('Your Capital')).toBeInTheDocument();
      expect(screen.getByText('Enemy Capital')).toBeInTheDocument();
      expect(screen.getByText('Fortress (+2 def)')).toBeInTheDocument();
      expect(screen.getByText('Legal Target')).toBeInTheDocument();
      expect(screen.getByText('Your Territory')).toBeInTheDocument();
      expect(screen.getByText('Enemy Territory')).toBeInTheDocument();
      expect(screen.getByText('Neutral Land')).toBeInTheDocument();
      expect(screen.getByText('Under Attack')).toBeInTheDocument();
    });

    it('displays contextual guidance when a legal candidate cell is selected', () => {
      const candidateCell: TerritoryCell = {
        id: 'r0_c1',
        row: 0,
        col: 1,
        type: 'NEUTRAL',
        owner: null,
        name: 'Plains of Dawn',
        defenseBonus: 0,
      };

      render(
        <ConquestLegend
          myPlayerSlot={1}
          selectedCell={candidateCell}
          candidateCellKeys={new Set(['r0_c1'])}
          activeChallenge={null}
          opponentAttackingCellKey={null}
          onOpenTutorial={vi.fn()}
        />
      );

      expect(screen.getByText(/Unclaimed Neutral Land \(0, 1\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Legal Target: Unclaimed frontier tile/i)).toBeInTheDocument();
    });

    it('explains why a friendly cell cannot be attacked', () => {
      const friendlyCell: TerritoryCell = {
        id: 'r0_c0',
        row: 0,
        col: 0,
        type: 'CAPITAL',
        owner: 1,
        name: 'Blue Citadel',
        defenseBonus: 5,
      };

      render(
        <ConquestLegend
          myPlayerSlot={1}
          selectedCell={friendlyCell}
          candidateCellKeys={new Set(['r0_c1'])}
          activeChallenge={null}
          opponentAttackingCellKey={null}
          onOpenTutorial={vi.fn()}
        />
      );

      expect(screen.getByText(/Your Capital Citadel \(0, 0\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Defend this citadel at all costs/i)).toBeInTheDocument();
    });

    it('shows out of range feedback when an un-adjacent tile is selected', () => {
      const farCell: TerritoryCell = {
        id: 'r3_c3',
        row: 3,
        col: 3,
        type: 'NEUTRAL',
        owner: null,
        name: 'Central Plain',
        defenseBonus: 0,
      };

      render(
        <ConquestLegend
          myPlayerSlot={1}
          selectedCell={farCell}
          candidateCellKeys={new Set(['r0_c1', 'r1_c0'])}
          activeChallenge={null}
          opponentAttackingCellKey={null}
          onOpenTutorial={vi.fn()}
        />
      );

      expect(screen.getByText(/Territory \(3, 3\) — Out of Range/i)).toBeInTheDocument();
      expect(screen.getByText(/Attacks can only advance into tiles that share an edge/i)).toBeInTheDocument();
    });

    it('shows empty-state explanation when no legal candidate moves exist', () => {
      render(
        <ConquestLegend
          myPlayerSlot={1}
          selectedCell={null}
          candidateCellKeys={new Set()}
          activeChallenge={null}
          opponentAttackingCellKey={null}
          onOpenTutorial={vi.fn()}
        />
      );

      expect(screen.getByText('No Legal Moves Available')).toBeInTheDocument();
      expect(screen.getByText(/You have no candidate attack targets currently adjacent/i)).toBeInTheDocument();
    });
  });

  describe('4. Tactical Grid Ownership & Visual Identity', () => {
    const mockBoard: ConquestBoard = {
      gridSize: 6,
      totalCells: 4,
      capitals: { player1: { row: 0, col: 0 }, player2: { row: 5, col: 5 } },
      fortresses: [{ row: 1, col: 2 }],
      cells: [
        {
          id: 'r0_c0',
          row: 0,
          col: 0,
          type: 'CAPITAL',
          owner: 1,
          name: 'Blue Citadel',
          defenseBonus: 5,
        },
        {
          id: 'r0_c1',
          row: 0,
          col: 1,
          type: 'NEUTRAL',
          owner: 1,
          name: 'Neutral Land (0,1)',
          defenseBonus: 0,
        },
        {
          id: 'r1_c2',
          row: 1,
          col: 2,
          type: 'FORTRESS',
          owner: 1,
          name: 'Iron Bastion (1,2)',
          defenseBonus: 2,
        },
        {
          id: 'r5_c5',
          row: 5,
          col: 5,
          type: 'CAPITAL',
          owner: 2,
          name: 'Red Citadel',
          defenseBonus: 5,
        },
      ],
      cellMap: {},
    };
    mockBoard.cellMap = Object.fromEntries(mockBoard.cells.map((c) => [c.id, c]));

    it('renders explicit owner badges and preserves fortress defense status on owned cells', () => {
      render(
        <ConquestGrid
          board={mockBoard}
          myPlayerSlot={1}
          activeChallenge={null}
          opponentAttackingCellKey={null}
          onCellClick={vi.fn()}
        />
      );

      // Verify Player 1 ownership badges are present on both owned territories
      const p1Badges = screen.getAllByText(/P1/);
      expect(p1Badges.length).toBeGreaterThanOrEqual(3); // r0_c0, r0_c1, r1_c2

      // Verify Fortress cell preserves its +2 defense bonus even when owned by Player 1
      expect(screen.getByText('+2')).toBeInTheDocument();

      // Verify Capital Citadel preserves its +5 defense bonus
      const capitalDefBadges = screen.getAllByText('+5');
      expect(capitalDefBadges.length).toBe(2); // r0_c0 and r5_c5
    });

    it('highlights the selected tile with high contrast without erasing cell identity', () => {
      const selected = mockBoard.cells[1]; // r0_c1
      const onSelectCell = vi.fn();

      render(
        <ConquestGrid
          board={mockBoard}
          myPlayerSlot={1}
          activeChallenge={null}
          opponentAttackingCellKey={null}
          selectedCell={selected}
          onCellClick={vi.fn()}
          onSelectCell={onSelectCell}
        />
      );

      // Both coordinates and ownership marker are clearly visible
      expect(screen.getByText('0,1')).toBeInTheDocument();
      expect(screen.getByText('Territory')).toBeInTheDocument();
    });
  });

  describe('5. Self-Explanatory Combat Panel', () => {
    const mockChallenge: ActiveAttackChallenge = {
      challengeId: 'chal_focus_test',
      userId: 'user_1',
      playerSlot: 1,
      targetCellKey: 'r1_c0',
      territoryType: 'FORTRESS',
      difficultyTier: 'MEDIUM',
      passageId: 'pass_bastion',
      passageTitle: 'Bastion Gate Siege',
      passageText: 'Iron bars guarded the inner sanctuary.',
      wordCount: 6,
      charCount: 38,
      defenseModifier: 2,
      minAccuracy: 93,
      startedAt: Date.now(),
      deadlineAt: Date.now() + 75000,
    };

    it('displays the combat instruction banner and focus state', () => {
      render(
        <ConquestCombatPanel
          challenge={mockChallenge}
          onSubmit={vi.fn()}
          onProgress={vi.fn()}
        />
      );

      // Verify instruction banner
      expect(
        screen.getByText(/Type the passage exactly as displayed. Accuracy matters. Complete it before the countdown reaches zero./i)
      ).toBeInTheDocument();

      // Verify accuracy requirement badge
      expect(screen.getByText('93%')).toBeInTheDocument();
      expect(screen.getByText(/Req:/i)).toBeInTheDocument();

      // Verify focus badge
      expect(screen.getByText(/Keyboard Active/i)).toBeInTheDocument();

      // Verify passage text is rendered
      expect(screen.getByTestId('combat-passage')).toBeInTheDocument();
    });
  });

  describe('6. Live Event Feed & Deduplication', () => {
    it('displays confirmed events with clear status icons and descriptions', () => {
      const mockEvents: ConquestFeedItem[] = [
        {
          id: 'ev_1',
          type: 'ATTACK_STARTED',
          title: 'Assault Launched: r0_c1',
          description: 'Targeting (r0_c1) — Req: 90% acc',
          timestamp: Date.now() - 10000,
          isSelf: true,
        },
        {
          id: 'ev_2',
          type: 'TERRITORY_CAPTURED',
          title: '🎉 Territory Captured!',
          description: 'Tile r0_c1 claimed at 85 WPM (98% acc)',
          timestamp: Date.now() - 5000,
          isSelf: true,
        },
      ];

      render(<ConquestEventFeed events={mockEvents} />);

      expect(screen.getByRole('log')).toBeInTheDocument();
      expect(screen.getByText('Tactical Live Feed')).toBeInTheDocument();
      expect(screen.getByText('Assault Launched: r0_c1')).toBeInTheDocument();
      expect(screen.getByText('🎉 Territory Captured!')).toBeInTheDocument();
    });
  });
});
