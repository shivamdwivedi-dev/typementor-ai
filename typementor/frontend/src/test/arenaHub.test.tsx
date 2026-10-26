import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ArenaHub } from '../pages/ArenaHub';
import { ConquestPreview } from '../pages/ConquestPreview';
import { useAuthStore } from '../store/AuthStore';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Multiplayer Arena Game Hub UX', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: { id: 'user_123', email: 'gamer@typementor.in', name: 'Gamer 1', level: 3 } as any,
      token: 'mock_jwt_token',
      isAuthenticated: true,
      isLoading: false,
    });
  });

  describe('ArenaHub Component', () => {
    it('renders the game hub header and both game cards', async () => {
      render(
        <MemoryRouter>
          <ArenaHub />
        </MemoryRouter>
      );

      // Verify Header and Badges
      expect(screen.getByText(/Typing Arena/i)).toBeInTheDocument();
      expect(screen.getByText(/Multiplayer Game Hub/i)).toBeInTheDocument();

      // Verify Card 1: Arena Duel
      expect(screen.getByText('Arena Duel')).toBeInTheDocument();
      expect(screen.getByText(/Available Now/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Play Arena Duel/i })).toBeInTheDocument();

      // Verify Card 2: Word Conquest
      expect(screen.getByText('Word Conquest')).toBeInTheDocument();
      expect(screen.getByText(/Live Playable/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Play Word Conquest/i })).toBeInTheDocument();
    });

    it('navigates to /arena/duel when clicking Play Arena Duel', () => {
      render(
        <MemoryRouter>
          <ArenaHub />
        </MemoryRouter>
      );

      const duelBtn = screen.getByRole('button', { name: /Play Arena Duel/i });
      fireEvent.click(duelBtn);

      expect(mockNavigate).toHaveBeenCalledWith('/arena/duel');
    });

    it('navigates to /arena/conquest/play when clicking Play Word Conquest', () => {
      render(
        <MemoryRouter>
          <ArenaHub />
        </MemoryRouter>
      );

      const conquestPlayBtn = screen.getByRole('button', { name: /Play Word Conquest/i });
      fireEvent.click(conquestPlayBtn);

      expect(mockNavigate).toHaveBeenCalledWith('/arena/conquest/play');
    });

    it('navigates to /arena/conquest when clicking Rules', () => {
      render(
        <MemoryRouter>
          <ArenaHub />
        </MemoryRouter>
      );

      const conquestBtn = screen.getByRole('button', { name: /Rules/i });
      fireEvent.click(conquestBtn);

      expect(mockNavigate).toHaveBeenCalledWith('/arena/conquest');
    });
  });

  describe('ConquestPreview Component', () => {
    it('renders the Word Conquest rules and tactical map preview', () => {
      render(
        <MemoryRouter>
          <ConquestPreview />
        </MemoryRouter>
      );

      expect(screen.getByRole('heading', { name: 'Word Conquest' })).toBeInTheDocument();
      expect(screen.getByText(/Tactical Map Blueprint/i)).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /1. Adjacency Rule/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /2. Typing Challenges/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /3. Capital Victory/i })).toBeInTheDocument();
    });

    it('navigates back to /arena when clicking Back to Arena Hub', () => {
      render(
        <MemoryRouter>
          <ConquestPreview />
        </MemoryRouter>
      );

      const backBtn = screen.getByRole('button', { name: /Back to Arena Hub/i });
      fireEvent.click(backBtn);

      expect(mockNavigate).toHaveBeenCalledWith('/arena');
    });
  });
});
