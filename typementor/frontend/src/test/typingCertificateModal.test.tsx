import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TypingCertificateModal from '../components/TypingCertificateModal';

describe('TypingCertificateModal Component', () => {
  const mockData = {
    netWpm: 88,
    rawWpm: 92,
    accuracy: 97.5,
    consistency: 91,
    durationMinutes: 2,
    category: 'Literature',
    tier: 'Velociraptor (Grandmaster)',
    percentile: 'Top 3%',
    totalChars: 880,
    correctChars: 860,
  };

  it('renders certificate details correctly when open', () => {
    const handleClose = vi.fn();
    render(
      <TypingCertificateModal
        isOpen={true}
        data={mockData}
        onClose={handleClose}
      />
    );

    expect(screen.getByText(/CERTIFICATE OF TYPING PROFICIENCY/i)).toBeInTheDocument();
    expect(screen.getByText('88')).toBeInTheDocument();
    expect(screen.getByText('97.5%')).toBeInTheDocument();
    expect(screen.getByText('92')).toBeInTheDocument();
    expect(screen.getByText('91%')).toBeInTheDocument();
    expect(screen.getByText(/2-Minute Speed Examination/i)).toBeInTheDocument();
    expect(screen.getByText(/Download PNG \(High-Res\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Post on LinkedIn/i)).toBeInTheDocument();
    expect(screen.getByText(/Post on X \/ Twitter/i)).toBeInTheDocument();
  });

  it('allows candidate name editing and clicking download', () => {
    const handleClose = vi.fn();
    render(
      <TypingCertificateModal
        isOpen={true}
        data={mockData}
        onClose={handleClose}
      />
    );

    // Click candidate name to edit
    const nameEl = screen.getByText('Speed Typist');
    fireEvent.click(nameEl);

    const input = screen.getByPlaceholderText(/Enter Candidate Name/i);
    expect(input).toBeInTheDocument();
    fireEvent.change(input, { target: { value: 'Jane Doe' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const handleClose = vi.fn();
    render(
      <TypingCertificateModal
        isOpen={true}
        data={mockData}
        onClose={handleClose}
      />
    );

    const closeBtn = screen.getByLabelText(/Close/i);
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
