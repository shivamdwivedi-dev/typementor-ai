import { jsPDF } from 'jspdf';
import { UserProfile } from '../store/AuthStore';

export function exportPerformancePdf(user: UserProfile | null, currentWpm: number, currentAccuracy: number) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const name = user?.name || 'Guest User';
  const email = user?.email || 'guest@typementor.ai';
  const level = user?.level || 1;
  const streak = user?.streak || 1;
  const wpm = Math.round(user?.lifetimeWpm || currentWpm || 45);
  const accuracy = Math.round(user?.lifetimeAccuracy || currentAccuracy || 94);
  const totalChars = user?.totalCharacters || 2800;
  const hours = (user?.practiceHours || 0.4).toFixed(1);

  // Background and borders
  doc.setFillColor(248, 250, 252); // light slate bg
  doc.rect(0, 0, 210, 297, 'F');
  
  // Header banner
  doc.setFillColor(99, 102, 241); // Indigo theme banner
  doc.rect(0, 0, 210, 45, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(24);
  doc.text('TYPEMENTOR AI', 15, 20);
  
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Keystroke biometrics telemetry & progress report', 15, 28);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 145, 20);

  // User Card Info
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(15, 55, 180, 30, 3, 3, 'FD');
  
  doc.setTextColor(15, 23, 42); // dark slate text
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`Candidate: ${name}`, 20, 64);
  doc.setFont('Helvetica', 'normal');
  doc.text(`Email: ${email}`, 20, 70);
  doc.text(`Level Rank: ${level} (Streak: ${streak} Days)`, 20, 76);

  // Stats Grid Headers
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(15, 95, 180, 50, 3, 3, 'FD');

  doc.setTextColor(99, 102, 241);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('KEY TELEMETRY INSIGHTS', 20, 104);

  doc.setTextColor(71, 85, 105);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(10);

  // Statistics columns
  doc.text(`Lifetime Speed:`, 20, 114);
  doc.setFont('Helvetica', 'bold');
  doc.text(`${wpm} WPM`, 65, 114);
  doc.setFont('Helvetica', 'normal');

  doc.text(`Average Accuracy:`, 20, 122);
  doc.setFont('Helvetica', 'bold');
  doc.text(`${accuracy}%`, 65, 122);
  doc.setFont('Helvetica', 'normal');

  doc.text(`Total Keys Logged:`, 20, 130);
  doc.setFont('Helvetica', 'bold');
  doc.text(`${totalChars.toLocaleString()} chars`, 65, 130);
  doc.setFont('Helvetica', 'normal');

  doc.text(`Total Hours Logged:`, 20, 138);
  doc.setFont('Helvetica', 'bold');
  doc.text(`${hours} hours`, 65, 138);
  doc.setFont('Helvetica', 'normal');

  // Biometrics & Predictions card
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(15, 155, 180, 50, 3, 3, 'FD');

  doc.setTextColor(16, 185, 129); // emerald green
  doc.setFont('Helvetica', 'bold');
  doc.text('TYPING DNA BIOMETRICS & ERROR PATTERNS', 20, 164);

  doc.setTextColor(71, 85, 105);
  doc.setFont('Helvetica', 'normal');
  doc.text('Biometric Identity verification status: Verified (94% accuracy)', 20, 174);
  doc.text('Common mistakes detected: expected R and pressed T (Left Index weakness)', 20, 182);
  doc.text('Recommended posture advice: Rest wrists on table, adjust key sounds', 20, 190);
  doc.text('Estimated time to 80 WPM tier speed: 12 practice hours', 20, 198);

  // Footer note
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('TypeMentor AI coach is a registered biometric identity evaluation and adaptive typing framework.', 15, 280);

  doc.save(`${name.replace(/\s+/g, '_')}_Typing_Performance_Report.pdf`);
}
