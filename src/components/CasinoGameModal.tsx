import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  CASINO_STATIONS,
  CrashGameState,
  GameStationId,
  PlayingCard,
  RouletteBet,
  RouletteGameState,
} from '../types/casino.ts';
import { soundFX } from '../utils/sound.ts';
import { X, Volume2, VolumeX, RotateCcw, Coins, Flame, Trophy, Sparkles, ShieldAlert } from 'lucide-react';

interface CasinoGameModalProps {
  stationId: GameStationId;
  balance: number;
  myPlayerId: string;
  crashState: CrashGameState;
  rouletteState: RouletteGameState;
  onClose: () => void;
  onSwitchStation: (id: GameStationId) => void;
  onWalletTransaction: (delta: number, gameName?: string, isRefund?: boolean) => void;
  onCrashBet: (amount: number) => void;
  onCrashCashout: () => void;
  onRouletteBet: (bet: RouletteBet) => void;
  onRouletteClear: () => void;
}

const SUITS: Array<'♠' | '♥' | '♦' | '♣'> = ['♠', '♥', '♦', '♣'];
const RANKS: Array<{ rank: PlayingCard['rank']; value: number }> = [
  { rank: '2', value: 2 },
  { rank: '3', value: 3 },
  { rank: '4', value: 4 },
  { rank: '5', value: 5 },
  { rank: '6', value: 6 },
  { rank: '7', value: 7 },
  { rank: '8', value: 8 },
  { rank: '9', value: 9 },
  { rank: '10', value: 10 },
  { rank: 'J', value: 10 },
  { rank: 'Q', value: 10 },
  { rank: 'K', value: 10 },
  { rank: 'A', value: 11 },
];

const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

function createShuffledDeck(): PlayingCard[] {
  const deck: PlayingCard[] = [];
  for (const s of SUITS) {
    for (const r of RANKS) {
      deck.push({ suit: s, rank: r.rank, value: r.value });
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function calculateBlackjackScore(hand: PlayingCard[]): number {
  let total = 0;
  let aces = 0;
  for (const c of hand) {
    total += c.value;
    if (c.rank === 'A') aces++;
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

const rankOrderValue: Record<string, number> = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

function evaluatePokerSevenCards(cards: PlayingCard[]): {
  tier: number;
  handName: string;
  tieBreaker: number;
} {
  const counts: Record<number, number> = {};
  const suitCounts: Record<string, PlayingCard[]> = { '♠': [], '♥': [], '♦': [], '♣': [] };

  for (const c of cards) {
    const rv = rankOrderValue[c.rank];
    counts[rv] = (counts[rv] || 0) + 1;
    suitCounts[c.suit].push(c);
  }

  const flushSuit = Object.keys(suitCounts).find((s) => suitCounts[s].length >= 5);
  const uniqueRanks = Object.keys(counts)
    .map(Number)
    .sort((a, b) => b - a);

  // Check Straight
  let straightHigh = 0;
  const checkRanks = uniqueRanks.includes(14) ? [...uniqueRanks, 1] : uniqueRanks;
  let consecutive = 1;
  for (let i = 0; i < checkRanks.length - 1; i++) {
    if (checkRanks[i] - 1 === checkRanks[i + 1]) {
      consecutive++;
      if (consecutive >= 5 && straightHigh === 0) {
        straightHigh = checkRanks[i - 3];
      }
    } else {
      consecutive = 1;
    }
  }

  const pairs: number[] = [];
  const trips: number[] = [];
  const quads: number[] = [];

  for (const r of uniqueRanks) {
    if (counts[r] === 4) quads.push(r);
    else if (counts[r] === 3) trips.push(r);
    else if (counts[r] === 2) pairs.push(r);
  }

  if (flushSuit && straightHigh > 0) {
    return {
      tier: 8,
      handName: straightHigh === 14 ? 'Quinte Flush Royale' : 'Quinte Flush',
      tieBreaker: straightHigh,
    };
  }
  if (quads.length > 0) {
    return { tier: 7, handName: 'Carré', tieBreaker: quads[0] * 100 };
  }
  if (trips.length > 0 && (pairs.length > 0 || trips.length > 1)) {
    const pairVal = trips.length > 1 ? trips[1] : pairs[0];
    return { tier: 6, handName: 'Full House', tieBreaker: trips[0] * 100 + pairVal };
  }
  if (flushSuit) {
    const topFlush = suitCounts[flushSuit]
      .map((c) => rankOrderValue[c.rank])
      .sort((a, b) => b - a)[0];
    return { tier: 5, handName: 'Couleur (Flush)', tieBreaker: topFlush };
  }
  if (straightHigh > 0) {
    return { tier: 4, handName: 'Suite (Quinte)', tieBreaker: straightHigh };
  }
  if (trips.length > 0) {
    return { tier: 3, handName: 'Brelan', tieBreaker: trips[0] * 100 + (uniqueRanks[0] || 0) };
  }
  if (pairs.length >= 2) {
    return { tier: 2, handName: 'Double Paire', tieBreaker: pairs[0] * 100 + pairs[1] };
  }
  if (pairs.length === 1) {
    return { tier: 1, handName: 'Paire', tieBreaker: pairs[0] * 100 + (uniqueRanks[0] || 0) };
  }
  return { tier: 0, handName: 'Carte Haute', tieBreaker: uniqueRanks[0] || 0 };
}

const CardVisual: React.FC<{ card?: PlayingCard; hidden?: boolean }> = ({ card, hidden }) => {
  if (hidden || !card) {
    return (
      <div className="w-16 h-24 sm:w-20 sm:h-28 rounded-xl bg-gradient-to-br from-[#1E3A5F] to-[#0F172A] border-2 border-[#D4AF37]/70 shadow-lg flex items-center justify-center">
        <div className="w-11 h-18 rounded-lg border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] font-display text-lg">
          MC
        </div>
      </div>
    );
  }
  const isRed = card.suit === '♥' || card.suit === '♦';
  return (
    <div className="w-16 h-24 sm:w-20 sm:h-28 rounded-xl bg-white border border-slate-200 shadow-lg flex flex-col justify-between p-2 select-none transition-transform hover:-translate-y-1">
      <div className={`text-xs sm:text-sm font-bold leading-none ${isRed ? 'text-red-600' : 'text-slate-900'}`}>
        <div>{card.rank}</div>
        <div>{card.suit}</div>
      </div>
      <div className={`text-2xl sm:text-3xl self-center ${isRed ? 'text-red-600' : 'text-slate-900'}`}>
        {card.suit}
      </div>
      <div className={`text-xs sm:text-sm font-bold leading-none self-end rotate-180 ${isRed ? 'text-red-600' : 'text-slate-900'}`}>
        <div>{card.rank}</div>
        <div>{card.suit}</div>
      </div>
    </div>
  );
};

export const CasinoGameModal: React.FC<CasinoGameModalProps> = ({
  stationId,
  balance,
  myPlayerId,
  crashState,
  rouletteState,
  onClose,
  onSwitchStation,
  onWalletTransaction,
  onCrashBet,
  onCrashCashout,
  onRouletteBet,
  onRouletteClear,
}) => {
  const station = CASINO_STATIONS.find((s) => s.id === stationId) || CASINO_STATIONS[0];
  const [chipAmount, setChipAmount] = useState<number>(25);
  const [soundMuted, setSoundMuted] = useState<boolean>(soundFX.muted);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    text: string;
    isWin: boolean;
  } | null>(null);

  const showWinBanner = (text: string, isBig = false) => {
    setFeedbackBanner({ text, isWin: true });
    soundFX.playWinChime(isBig);
    if (isBig) {
      confetti({ particleCount: 70, spread: 65, origin: { y: 0.6 } });
    }
  };

  const showLossBanner = (text: string) => {
    setFeedbackBanner({ text, isWin: false });
    soundFX.playLoseThud();
  };

  // ============================================================================
  // 1. BLACKJACK 21 STATE & LOGIC
  // ============================================================================
  const [bjDeck, setBjDeck] = useState<PlayingCard[]>([]);
  const [bjPlayerHand, setBjPlayerHand] = useState<PlayingCard[]>([]);
  const [bjDealerHand, setBjDealerHand] = useState<PlayingCard[]>([]);
  const [bjBet, setBjBet] = useState<number>(0);
  const [bjPhase, setBjPhase] = useState<'IDLE' | 'PLAYING' | 'DEALER' | 'DONE'>('IDLE');

  const startBlackjack = () => {
    if (balance < chipAmount || chipAmount <= 0) return;
    setFeedbackBanner(null);
    onWalletTransaction(-chipAmount, 'Blackjack 21 VIP');
    soundFX.playCardDeal();

    const deck = createShuffledDeck();
    const pHand = [deck.pop()!, deck.pop()!];
    const dHand = [deck.pop()!, deck.pop()!];

    setBjDeck(deck);
    setBjPlayerHand(pHand);
    setBjDealerHand(dHand);
    setBjBet(chipAmount);

    const pScore = calculateBlackjackScore(pHand);
    if (pScore === 21) {
      const win = Math.round(chipAmount * 2.5);
      onWalletTransaction(win, 'Blackjack 21 VIP');
      setBjPhase('DONE');
      showWinBanner(`BLACKJACK NATUREL ! Vous gagnez +${win} €`, true);
    } else {
      setBjPhase('PLAYING');
    }
  };

  const hitBlackjack = () => {
    if (bjPhase !== 'PLAYING') return;
    soundFX.playCardDeal();
    const deck = [...bjDeck];
    const nextCard = deck.pop()!;
    const newHand = [...bjPlayerHand, nextCard];
    setBjDeck(deck);
    setBjPlayerHand(newHand);

    const score = calculateBlackjackScore(newHand);
    if (score > 21) {
      setBjPhase('DONE');
      showLossBanner(`Dépassé (${score}) ! La banque gagne.`);
    } else if (score === 21) {
      standBlackjack(newHand, deck, bjBet);
    }
  };

  const standBlackjack = (
    customHand = bjPlayerHand,
    customDeck = bjDeck,
    activeBet = bjBet
  ) => {
    setBjPhase('DEALER');
    soundFX.playCardDeal();
    const deck = [...customDeck];
    const dHand = [...bjDealerHand];

    while (calculateBlackjackScore(dHand) < 17 && deck.length > 0) {
      dHand.push(deck.pop()!);
    }
    setBjDeck(deck);
    setBjDealerHand(dHand);
    setBjPhase('DONE');

    const pScore = calculateBlackjackScore(customHand);
    const dScore = calculateBlackjackScore(dHand);

    if (dScore > 21 || pScore > dScore) {
      const win = activeBet * 2;
      onWalletTransaction(win, 'Blackjack 21 VIP');
      showWinBanner(`Victoire (${pScore} contre ${dScore}) ! Vous encaissez +${win} €`, win >= 150);
    } else if (dScore === pScore) {
      onWalletTransaction(activeBet, 'Blackjack 21 VIP', true);
      setFeedbackBanner({ text: `Égalité (${pScore}) ! Mise de ${activeBet} € remboursée.`, isWin: true });
    } else {
      showLossBanner(`Le Croupier l'emporte (${dScore} contre ${pScore}).`);
    }
  };

  const doubleBlackjack = () => {
    if (bjPhase !== 'PLAYING' || balance < bjBet) return;
    onWalletTransaction(-bjBet, 'Blackjack 21 VIP');
    const newBet = bjBet * 2;
    setBjBet(newBet);
    const deck = [...bjDeck];
    const nextCard = deck.pop()!;
    const newHand = [...bjPlayerHand, nextCard];
    setBjDeck(deck);
    setBjPlayerHand(newHand);

    const score = calculateBlackjackScore(newHand);
    if (score > 21) {
      setBjPhase('DONE');
      showLossBanner(`Double et dépassé (${score}) !`);
    } else {
      standBlackjack(newHand, deck, newBet);
    }
  };

  // ============================================================================
  // 2. TEXAS HOLD'EM POKER STATE & LOGIC
  // ============================================================================
  const [pkDeck, setPkDeck] = useState<PlayingCard[]>([]);
  const [pkPlayer, setPkPlayer] = useState<PlayingCard[]>([]);
  const [pkDealer, setPkDealer] = useState<PlayingCard[]>([]);
  const [pkCommunity, setPkCommunity] = useState<PlayingCard[]>([]);
  const [pkStage, setPkStage] = useState<'IDLE' | 'PREFLOP' | 'FLOP' | 'RIVER' | 'SHOWDOWN'>('IDLE');
  const [pkPot, setPkPot] = useState<number>(0);

  const startPokerDeal = () => {
    if (balance < chipAmount || chipAmount <= 0) return;
    setFeedbackBanner(null);
    onWalletTransaction(-chipAmount, "Texas Hold'em Poker");
    soundFX.playCardDeal();

    const deck = createShuffledDeck();
    const p = [deck.pop()!, deck.pop()!];
    const d = [deck.pop()!, deck.pop()!];
    const comm = [deck.pop()!, deck.pop()!, deck.pop()!, deck.pop()!, deck.pop()!];

    setPkDeck(deck);
    setPkPlayer(p);
    setPkDealer(d);
    setPkCommunity(comm);
    setPkPot(chipAmount);
    setPkStage('PREFLOP');
  };

  const advancePokerStage = (raiseMultiplier: number) => {
    const raiseCost = raiseMultiplier > 0 ? chipAmount * raiseMultiplier : 0;
    if (raiseCost > 0) {
      if (balance < raiseCost) return;
      onWalletTransaction(-raiseCost, "Texas Hold'em Poker");
    }
    const updatedPot = pkPot + raiseCost;
    setPkPot(updatedPot);
    soundFX.playCardDeal();

    if (pkStage === 'PREFLOP') {
      setPkStage('FLOP');
    } else if (pkStage === 'FLOP') {
      setPkStage('RIVER');
    } else if (pkStage === 'RIVER') {
      setPkStage('SHOWDOWN');
      const pEval = evaluatePokerSevenCards([...pkPlayer, ...pkCommunity]);
      const dEval = evaluatePokerSevenCards([...pkDealer, ...pkCommunity]);

      const playerWins =
        pEval.tier > dEval.tier ||
        (pEval.tier === dEval.tier && pEval.tieBreaker > dEval.tieBreaker);
      const isTie = pEval.tier === dEval.tier && pEval.tieBreaker === dEval.tieBreaker;

      if (playerWins) {
        const bonusMult = pEval.tier >= 5 ? 3 : 2;
        const payout = updatedPot * bonusMult;
        onWalletTransaction(payout, "Texas Hold'em Poker");
        showWinBanner(
          `${pEval.handName} bat ${dEval.handName} du Croupier ! Gain : +${payout} €`,
          payout >= 150
        );
      } else if (isTie) {
        onWalletTransaction(updatedPot, "Texas Hold'em Poker", true);
        setFeedbackBanner({ text: `Égalité parfaite (${pEval.handName}) ! Pot de ${updatedPot} € remboursé.`, isWin: true });
      } else {
        showLossBanner(`Le Croupier gagne avec ${dEval.handName} contre votre ${pEval.handName}.`);
      }
    }
  };

  const foldPoker = () => {
    setPkStage('SHOWDOWN');
    showLossBanner(`Vous vous êtes couché. Pot abandonné.`);
  };

  // ============================================================================
  // 3. MINES DIAMANT 5x5 STATE & LOGIC
  // ============================================================================
  const [minesCount, setMinesCount] = useState<number>(3);
  const [minesActive, setMinesActive] = useState<boolean>(false);
  const [minesBet, setMinesBet] = useState<number>(0);
  const [minesBombs, setMinesBombs] = useState<Set<number>>(new Set());
  const [minesRevealed, setMinesRevealed] = useState<Set<number>>(new Set());
  const [minesExploded, setMinesExploded] = useState<number | null>(null);

  const getMinesMultiplier = (revealedGems: number, bombs: number) => {
    if (revealedGems === 0) return 1.0;
    let prob = 1;
    for (let i = 0; i < revealedGems; i++) {
      prob *= (25 - bombs - i) / (25 - i);
    }
    return Math.max(1.05, Math.round((0.97 / prob) * 100) / 100);
  };

  const startMinesGame = () => {
    if (balance < chipAmount || chipAmount <= 0) return;
    setFeedbackBanner(null);
    onWalletTransaction(-chipAmount, 'Mines Diamant');
    soundFX.playChipClick();

    const bombs = new Set<number>();
    while (bombs.size < minesCount) {
      bombs.add(Math.floor(Math.random() * 25));
    }
    setMinesBombs(bombs);
    setMinesRevealed(new Set());
    setMinesExploded(null);
    setMinesBet(chipAmount);
    setMinesActive(true);
  };

  const clickMineTile = (idx: number) => {
    if (!minesActive || minesRevealed.has(idx)) return;
    if (minesBombs.has(idx)) {
      setMinesExploded(idx);
      setMinesActive(false);
      showLossBanner('BOUM ! Vous êtes tombé sur une mine.');
    } else {
      soundFX.playPinBounce();
      const nextRev = new Set(minesRevealed);
      nextRev.add(idx);
      setMinesRevealed(nextRev);
      if (nextRev.size === 25 - minesCount) {
        const mult = getMinesMultiplier(nextRev.size, minesCount);
        const win = Math.round(minesBet * mult * 100) / 100;
        setMinesActive(false);
        onWalletTransaction(win, 'Mines Diamant');
        showWinBanner(`Grille parfaite ! Vous encaissez +${win} € (${mult}x)`, true);
      }
    }
  };

  const cashoutMines = () => {
    if (!minesActive || minesRevealed.size === 0) return;
    const mult = getMinesMultiplier(minesRevealed.size, minesCount);
    const win = Math.round(minesBet * mult * 100) / 100;
    setMinesActive(false);
    onWalletTransaction(win, 'Mines Diamant');
    showWinBanner(`Encaissé avec succès : +${win} € (${mult}x)`, win >= 150);
  };

  // ============================================================================
  // 4. CHICKEN RUN TRAVERSÉE STATE & LOGIC
  // ============================================================================
  const [chickenDiff, setChickenDiff] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [chickenActive, setChickenActive] = useState<boolean>(false);
  const [chickenLane, setChickenLane] = useState<number>(-1);
  const [chickenBet, setChickenBet] = useState<number>(0);
  const [chickenTrapLane, setChickenTrapLane] = useState<number | null>(null);

  const chickenLanesMultipliers: Record<'easy' | 'medium' | 'hard', number[]> = {
    easy: [1.25, 1.65, 2.2, 3.1, 4.5, 6.8],
    medium: [1.45, 2.15, 3.3, 5.2, 8.5, 14.5],
    hard: [1.9, 3.6, 7.2, 15.0, 28.0, 45.5],
  };

  const startChickenRun = () => {
    if (balance < chipAmount || chipAmount <= 0) return;
    setFeedbackBanner(null);
    onWalletTransaction(-chipAmount, 'Chicken Run');
    soundFX.playBoingJump();
    setChickenBet(chipAmount);
    setChickenLane(-1);
    setChickenTrapLane(null);
    setChickenActive(true);
  };

  const advanceChickenLane = () => {
    if (!chickenActive) return;
    const nextLane = chickenLane + 1;
    const failChance = chickenDiff === 'easy' ? 0.18 : chickenDiff === 'medium' ? 0.28 : 0.42;

    if (Math.random() < failChance) {
      setChickenTrapLane(nextLane);
      setChickenActive(false);
      showLossBanner(`Aïe ! Votre poulet ragdoll s'est fait renverser sur la voie ${nextLane + 1} !`);
    } else {
      soundFX.playBoingJump();
      setChickenLane(nextLane);
      const mults = chickenLanesMultipliers[chickenDiff];
      if (nextLane === mults.length - 1) {
        const win = Math.round(chickenBet * mults[nextLane] * 100) / 100;
        setChickenActive(false);
        onWalletTransaction(win, 'Chicken Run');
        showWinBanner(`Traversée complète ! Vous remportez +${win} € (${mults[nextLane]}x)`, true);
      }
    }
  };

  const cashoutChickenRun = () => {
    if (!chickenActive || chickenLane < 0) return;
    const mult = chickenLanesMultipliers[chickenDiff][chickenLane];
    const win = Math.round(chickenBet * mult * 100) / 100;
    setChickenActive(false);
    onWalletTransaction(win, 'Chicken Run');
    showWinBanner(`Poulet sauvé ! Vous encaissez +${win} € (${mult}x)`, win >= 150);
  };

  // ============================================================================
  // 5. PLINKO PHYSIQUE STATE & LOGIC
  // ============================================================================
  const PLINKO_BUCKETS = [29, 9, 4, 2, 0.5, 0.2, 0.5, 2, 4, 9, 29];
  const [plinkoDrops, setPlinkoDrops] = useState<
    Array<{ id: number; bucketIdx: number; mult: number; payout: number }>
  >([]);
  const [activeBallRow, setActiveBallRow] = useState<number | null>(null);
  const [activeBallCol, setActiveBallCol] = useState<number>(5);

  const dropPlinkoBall = () => {
    if (balance < chipAmount || chipAmount <= 0) return;
    onWalletTransaction(-chipAmount, 'Plinko Physique');
    soundFX.playChipClick();

    // Simulate realistic binomial bounces across 10 rows
    let rightBounces = 0;
    for (let r = 0; r < 10; r++) {
      if (Math.random() < 0.5) rightBounces++;
    }
    const mult = PLINKO_BUCKETS[rightBounces];
    const payout = Math.round(chipAmount * mult * 100) / 100;

    setActiveBallRow(0);
    setActiveBallCol(5);

    let step = 0;
    const timer = setInterval(() => {
      step++;
      soundFX.playPinBounce();
      setActiveBallRow(step);
      setActiveBallCol(Math.round(5 + ((rightBounces - 5) * step) / 10));
      if (step >= 10) {
        clearInterval(timer);
        setActiveBallRow(null);
        onWalletTransaction(payout, 'Plinko Physique');
        setPlinkoDrops((prev) => [
          { id: Date.now() + Math.random(), bucketIdx: rightBounces, mult, payout },
          ...prev.slice(0, 7),
        ]);
        if (mult >= 2) {
          showWinBanner(`Bille dans le panier ${mult}x ! Gain : +${payout} €`, mult >= 9);
        }
      }
    }, 65);
  };

  // ============================================================================
  // 6. LUCKY DICE 100 STATE & LOGIC
  // ============================================================================
  const [diceTarget, setDiceTarget] = useState<number>(50);
  const [diceMode, setDiceMode] = useState<'under' | 'over'>('under');
  const [lastDiceRoll, setLastDiceRoll] = useState<number | null>(null);

  const diceWinProbability = diceMode === 'under' ? diceTarget : 100 - diceTarget;
  const diceMultiplier = Math.max(1.02, Math.round((98 / Math.max(2, diceWinProbability)) * 100) / 100);

  const rollLuckyDice = () => {
    if (balance < chipAmount || chipAmount <= 0) return;
    onWalletTransaction(-chipAmount, 'Lucky Dice 100');
    soundFX.playChipClick();

    const roll = Math.round(Math.random() * 10000) / 100;
    setLastDiceRoll(roll);

    const won = diceMode === 'under' ? roll < diceTarget : roll > diceTarget;
    if (won) {
      const payout = Math.round(chipAmount * diceMultiplier * 100) / 100;
      onWalletTransaction(payout, 'Lucky Dice 100');
      showWinBanner(`Lancé : ${roll.toFixed(2)} ! Vous gagnez +${payout} € (${diceMultiplier}x)`, payout >= 150);
    } else {
      showLossBanner(`Lancé : ${roll.toFixed(2)}. Pas de chance !`);
    }
  };

  // ============================================================================
  // 7. GRAND MONTE-CARLO SLOTS STATE & LOGIC
  // ============================================================================
  const SLOT_SYMBOLS = [
    { icon: '💎', name: 'Diamant Royal', mult3: 15, mult5: 120 },
    { icon: '7️⃣', name: 'Sept d’Or', mult3: 10, mult5: 60 },
    { icon: '👑', name: 'Couronne Princière', mult3: 6, mult5: 30 },
    { icon: '🍀', name: 'Trèfle Chanceux', mult3: 4, mult5: 18 },
    { icon: '🍒', name: 'Cerise Riviera', mult3: 2.5, mult5: 10 },
    { icon: '🔔', name: 'Cloche d’Argent', mult3: 3, mult5: 12 },
  ];

  const [slotsGrid, setSlotsGrid] = useState<string[][]>([
    ['💎', '7️⃣', '👑', '🍀', '🍒'],
    ['7️⃣', '💎', '💎', '💎', '7️⃣'],
    ['🍒', '🍀', '🔔', '👑', '🍒'],
  ]);
  const [slotsSpinning, setSlotsSpinning] = useState<boolean>(false);

  const spinSlots = () => {
    if (slotsSpinning || balance < chipAmount || chipAmount <= 0) return;
    setFeedbackBanner(null);
    onWalletTransaction(-chipAmount, 'Grand Monte-Carlo Slots');
    setSlotsSpinning(true);
    soundFX.playChipClick();

    setTimeout(() => {
      const newGrid: string[][] = [];
      for (let r = 0; r < 3; r++) {
        const row: string[] = [];
        for (let c = 0; c < 5; c++) {
          const sym = SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
          row.push(sym.icon);
        }
        newGrid.push(row);
      }
      setSlotsGrid(newGrid);
      setSlotsSpinning(false);

      // Evaluate middle payline, top payline, bottom payline + any 3+ matches
      let totalMultiplier = 0;
      for (let r = 0; r < 3; r++) {
        const row = newGrid[r];
        const counts: Record<string, number> = {};
        for (const s of row) counts[s] = (counts[s] || 0) + 1;
        for (const [symIcon, count] of Object.entries(counts)) {
          const def = SLOT_SYMBOLS.find((x) => x.icon === symIcon);
          if (!def) continue;
          if (count === 5) totalMultiplier += def.mult5;
          else if (count === 4) totalMultiplier += def.mult3 * 2;
          else if (count === 3) totalMultiplier += def.mult3;
        }
      }

      if (totalMultiplier > 0) {
        const win = Math.round(chipAmount * totalMultiplier * 100) / 100;
        onWalletTransaction(win, 'Grand Monte-Carlo Slots');
        showWinBanner(`Combinaison gagnante (${totalMultiplier}x) ! +${win} €`, win >= 150);
      } else {
        soundFX.playLoseThud();
      }
    }, 450);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-2 sm:p-6 bg-black/75 backdrop-blur-md">
      <div className="w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl bg-[#111827] border border-white/15 shadow-2xl overflow-hidden">
        {/* Modal Header with Quick Game Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-3.5 bg-[#0B0F17] border-b border-white/10">
          <div className="flex items-center gap-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#F8FAFC] tracking-tight">
              {station.name}
            </h2>
            <span className="text-xs text-slate-400 hidden sm:inline">
              · {station.subtitle} · Max {station.maxMultiplier}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-lg bg-[#1E293B] border border-[#D4AF37]/40 text-sm font-mono-num font-semibold text-[#D4AF37]">
              Solde : {balance.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
            </div>
            <button
              type="button"
              onClick={() => {
                soundFX.muted = !soundMuted;
                setSoundMuted(soundFX.muted);
              }}
              className="p-2 rounded-lg bg-slate-800/80 text-slate-300 hover:text-white transition-colors"
              title="Activer / Couper le son"
            >
              {soundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
            >
              <X className="w-4 h-4" />
              <span>Retour au Salon 3D</span>
            </button>
          </div>
        </div>

        {/* Fast Game Navigation Bar */}
        <div className="flex items-center gap-1.5 px-5 py-2 bg-[#0B0F17]/60 border-b border-white/5 overflow-x-auto">
          {CASINO_STATIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setFeedbackBanner(null);
                onSwitchStation(s.id);
              }}
              className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                s.id === stationId
                  ? 'bg-[#D4AF37] text-[#0B0F17] font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>

        {/* Main Interactive Table Surface */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {feedbackBanner && (
            <div
              className={`px-4 py-3 rounded-xl border text-sm font-semibold flex items-center justify-between ${
                feedbackBanner.isWin
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                  : 'bg-red-950/60 border-red-500/40 text-red-200'
              }`}
            >
              <span>{feedbackBanner.text}</span>
              <button
                type="button"
                onClick={() => setFeedbackBanner(null)}
                className="text-xs opacity-75 hover:opacity-100"
              >
                Fermer
              </button>
            </div>
          )}

          {/* ============================================================== */}
          {/* GAME 1: ROULETTE ROYALE (SYNCHRONIZED MULTIPLAYER)             */}
          {/* ============================================================== */}
          {stationId === 'roulette' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-[#0F5132]/40 border border-emerald-500/30">
                <div>
                  <div className="text-xs text-emerald-300 font-medium">
                    Table Multijoueur Synchronisée en Direct
                  </div>
                  <div className="text-xl font-bold text-white mt-0.5">
                    {rouletteState.phase === 'BETTING' &&
                      `Faites vos jeux ! Tirage dans ${rouletteState.countdown}s`}
                    {rouletteState.phase === 'SPINNING' && 'Rien ne va plus ! La bille tourne...'}
                    {rouletteState.phase === 'RESULT' &&
                      `Numéro Gagnant : ${rouletteState.winningNumber} (${
                        rouletteState.winningNumber === 0
                          ? 'Vert'
                          : RED_NUMBERS.has(rouletteState.winningNumber || 0)
                          ? 'Rouge'
                          : 'Noir'
                      })`}
                  </div>
                </div>

                {/* Recent History */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-400 mr-1">Historique :</span>
                  {rouletteState.history.map((num, idx) => {
                    const bg =
                      num === 0
                        ? 'bg-emerald-600'
                        : RED_NUMBERS.has(num)
                        ? 'bg-red-600'
                        : 'bg-slate-800';
                    return (
                      <span
                        key={idx}
                        className={`w-7 h-7 rounded-md ${bg} text-white text-xs font-mono-num font-bold flex items-center justify-center border border-white/15`}
                      >
                        {num}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* European Roulette Betting Carpet */}
              <div className="p-4 rounded-xl bg-[#0B3B24] border-2 border-[#D4AF37]/50 space-y-3">
                <div className="grid grid-cols-13 gap-1.5">
                  {/* Zero */}
                  <button
                    type="button"
                    disabled={rouletteState.phase !== 'BETTING'}
                    onClick={() => {
                      soundFX.playChipClick();
                      onRouletteBet({ type: 'number', value: 0, amount: chipAmount });
                    }}
                    className="col-span-1 row-span-3 rounded-lg bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white font-mono-num font-bold text-sm flex items-center justify-center border border-white/20 py-4"
                  >
                    0
                  </button>

                  {/* Numbers 1 to 36 */}
                  <div className="col-span-12 grid grid-cols-12 gap-1.5">
                    {Array.from({ length: 36 }, (_, i) => i + 1).map((num) => {
                      const isRed = RED_NUMBERS.has(num);
                      const isWinner = rouletteState.winningNumber === num;
                      return (
                        <button
                          key={num}
                          type="button"
                          disabled={rouletteState.phase !== 'BETTING'}
                          onClick={() => {
                            soundFX.playChipClick();
                            onRouletteBet({ type: 'number', value: num, amount: chipAmount });
                          }}
                          className={`h-10 rounded-md font-mono-num font-bold text-xs sm:text-sm text-white transition-transform active:scale-95 border ${
                            isWinner
                              ? 'ring-2 ring-[#D4AF37] border-[#D4AF37] scale-105'
                              : 'border-white/15'
                          } ${isRed ? 'bg-red-700 hover:bg-red-600' : 'bg-slate-900 hover:bg-slate-800'}`}
                        >
                          {num}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Outside Bets: Dozens & Even/Odd/Colors */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {[
                    { label: '1ère Douzaine (1-12) · 3x', val: '1st12' },
                    { label: '2ème Douzaine (13-24) · 3x', val: '2nd12' },
                    { label: '3ème Douzaine (25-36) · 3x', val: '3rd12' },
                  ].map((d) => (
                    <button
                      key={d.val}
                      type="button"
                      disabled={rouletteState.phase !== 'BETTING'}
                      onClick={() => {
                        soundFX.playChipClick();
                        onRouletteBet({ type: 'dozen', value: d.val, amount: chipAmount });
                      }}
                      className="py-2 rounded-lg bg-emerald-900/80 hover:bg-emerald-800 text-xs font-semibold text-white border border-white/15"
                    >
                      {d.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    disabled={rouletteState.phase !== 'BETTING'}
                    onClick={() => {
                      soundFX.playChipClick();
                      onRouletteBet({ type: 'color', value: 'red', amount: chipAmount });
                    }}
                    className="py-2.5 rounded-lg bg-red-700 hover:bg-red-600 text-xs font-bold text-white border border-white/20"
                  >
                    ROUGE (2x)
                  </button>
                  <button
                    type="button"
                    disabled={rouletteState.phase !== 'BETTING'}
                    onClick={() => {
                      soundFX.playChipClick();
                      onRouletteBet({ type: 'color', value: 'black', amount: chipAmount });
                    }}
                    className="py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs font-bold text-white border border-white/20"
                  >
                    NOIR (2x)
                  </button>
                  <button
                    type="button"
                    disabled={rouletteState.phase !== 'BETTING'}
                    onClick={() => {
                      soundFX.playChipClick();
                      onRouletteBet({ type: 'parity', value: 'even', amount: chipAmount });
                    }}
                    className="py-2.5 rounded-lg bg-emerald-900/90 hover:bg-emerald-800 text-xs font-bold text-white border border-white/20"
                  >
                    PAIR (2x)
                  </button>
                  <button
                    type="button"
                    disabled={rouletteState.phase !== 'BETTING'}
                    onClick={() => {
                      soundFX.playChipClick();
                      onRouletteBet({ type: 'parity', value: 'odd', amount: chipAmount });
                    }}
                    className="py-2.5 rounded-lg bg-emerald-900/90 hover:bg-emerald-800 text-xs font-bold text-white border border-white/20"
                  >
                    IMPAIR (2x)
                  </button>
                </div>
              </div>

              {/* Active Players Bets on Roulette */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900/80 border border-white/10">
                <div className="text-xs text-slate-300">
                  Mises actives sur la table :{' '}
                  {Object.values(rouletteState.playerBets).length === 0 ? (
                    <span className="text-slate-500">Aucune mise pour ce tour</span>
                  ) : (
                    Object.values(rouletteState.playerBets).map((pb, idx) => (
                      <span key={idx} className="mr-3 font-medium text-[#D4AF37]">
                        {pb.playerName}: {pb.totalBet} €
                        {pb.lastWin ? ` (+${pb.lastWin} €)` : ''}
                      </span>
                    ))
                  )}
                </div>
                {rouletteState.phase === 'BETTING' && rouletteState.playerBets[myPlayerId] && (
                  <button
                    type="button"
                    onClick={onRouletteClear}
                    className="flex items-center gap-1 px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-300"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Annuler mes mises
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* GAME 2: BLACKJACK 21 VIP                                       */}
          {/* ============================================================== */}
          {stationId === 'blackjack' && (
            <div className="p-6 rounded-2xl bg-[#0F5132] border-2 border-[#D4AF37]/50 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Dealer Hand */}
                <div className="p-4 rounded-xl bg-black/30 border border-white/10 flex flex-col items-center">
                  <div className="text-xs uppercase tracking-wider text-emerald-300 mb-3">
                    Main du Croupier ·{' '}
                    {bjPhase === 'PLAYING'
                      ? '?'
                      : bjDealerHand.length > 0
                      ? calculateBlackjackScore(bjDealerHand)
                      : 0}
                  </div>
                  <div className="flex items-center gap-2.5 min-h-[112px]">
                    {bjDealerHand.length === 0 ? (
                      <span className="text-xs text-emerald-200/60">En attente de distribution</span>
                    ) : (
                      bjDealerHand.map((c, idx) => (
                        <CardVisual key={idx} card={c} hidden={idx === 1 && bjPhase === 'PLAYING'} />
                      ))
                    )}
                  </div>
                </div>

                {/* Player Hand */}
                <div className="p-4 rounded-xl bg-black/30 border border-white/10 flex flex-col items-center">
                  <div className="text-xs uppercase tracking-wider text-[#D4AF37] mb-3">
                    Votre Main · {bjPlayerHand.length > 0 ? calculateBlackjackScore(bjPlayerHand) : 0}{' '}
                    {bjBet > 0 && `(Mise : ${bjBet} €)`}
                  </div>
                  <div className="flex items-center gap-2.5 min-h-[112px]">
                    {bjPlayerHand.length === 0 ? (
                      <span className="text-xs text-emerald-200/60">Cliquez sur Distribuer</span>
                    ) : (
                      bjPlayerHand.map((c, idx) => <CardVisual key={idx} card={c} />)
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3">
                {bjPhase !== 'PLAYING' ? (
                  <button
                    type="button"
                    onClick={startBlackjack}
                    className="px-6 py-3 rounded-xl bg-[#D4AF37] hover:bg-[#E5C158] text-[#0B0F17] font-bold text-sm shadow-lg transition-transform active:scale-95"
                  >
                    Distribuer ({chipAmount} €)
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={hitBlackjack}
                      className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm"
                    >
                      Tirer une carte (Hit)
                    </button>
                    <button
                      type="button"
                      onClick={() => standBlackjack()}
                      className="px-5 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#E5C158] text-slate-950 font-bold text-sm"
                    >
                      Rester (Stand)
                    </button>
                    {bjPlayerHand.length === 2 && balance >= bjBet && (
                      <button
                        type="button"
                        onClick={doubleBlackjack}
                        className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm"
                      >
                        Doubler ({bjBet} €)
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* GAME 3: TEXAS HOLD'EM POKER                                    */}
          {/* ============================================================== */}
          {stationId === 'poker' && (
            <div className="p-6 rounded-2xl bg-[#1E3A5F] border-2 border-[#D4AF37]/50 space-y-6">
              {/* Community Cards */}
              <div className="p-4 rounded-xl bg-black/30 border border-white/10 flex flex-col items-center">
                <div className="text-xs text-blue-200 mb-3">
                  Cartes Communes (Flop · Turn · River) · Pot Actuel :{' '}
                  <span className="font-mono-num font-bold text-[#D4AF37]">{pkPot} €</span>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2.5 min-h-[112px]">
                  {pkStage === 'IDLE' ? (
                    <span className="text-xs text-blue-200/60">Lancez une main pour voir le tableau</span>
                  ) : (
                    pkCommunity.map((c, idx) => {
                      const revealed =
                        (pkStage === 'FLOP' && idx < 3) ||
                        pkStage === 'RIVER' ||
                        pkStage === 'SHOWDOWN';
                      return <CardVisual key={idx} card={c} hidden={!revealed} />;
                    })
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-black/25 border border-white/10 flex flex-col items-center">
                  <span className="text-xs text-slate-300 mb-2">Main du Croupier</span>
                  <div className="flex gap-2.5">
                    {pkDealer.map((c, idx) => (
                      <CardVisual key={idx} card={c} hidden={pkStage !== 'SHOWDOWN'} />
                    ))}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-black/25 border border-white/10 flex flex-col items-center">
                  <span className="text-xs text-[#D4AF37] font-semibold mb-2">Vos Cartes Privées</span>
                  <div className="flex gap-2.5">
                    {pkPlayer.map((c, idx) => (
                      <CardVisual key={idx} card={c} />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3">
                {pkStage === 'IDLE' || pkStage === 'SHOWDOWN' ? (
                  <button
                    type="button"
                    onClick={startPokerDeal}
                    className="px-6 py-3 rounded-xl bg-[#D4AF37] hover:bg-[#E5C158] text-slate-950 font-bold text-sm"
                  >
                    Distribuer une main (Ante {chipAmount} €)
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => advancePokerStage(0)}
                      className="px-5 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-semibold text-sm"
                    >
                      Parole (Check)
                    </button>
                    <button
                      type="button"
                      onClick={() => advancePokerStage(1)}
                      className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm"
                    >
                      Relancer 1x (+{chipAmount} €)
                    </button>
                    <button
                      type="button"
                      onClick={() => advancePokerStage(2)}
                      className="px-5 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#E5C158] text-slate-950 font-bold text-sm"
                    >
                      Relancer 2x (+{chipAmount * 2} €)
                    </button>
                    <button
                      type="button"
                      onClick={foldPoker}
                      className="px-4 py-2.5 rounded-xl bg-red-800/80 hover:bg-red-700 text-white font-semibold text-sm"
                    >
                      Se coucher
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* GAME 4: ASTRONAUT CRASH (SYNCHRONIZED MULTIPLAYER)             */}
          {/* ============================================================== */}
          {stationId === 'crash' && (
            <div className="space-y-5">
              <div className="relative h-64 rounded-2xl bg-gradient-to-b from-[#1E1B4B] to-[#090D16] border border-amber-500/30 flex flex-col items-center justify-center overflow-hidden p-6">
                <div className="text-xs text-amber-300/80 uppercase tracking-widest mb-1">
                  {crashState.phase === 'BETTING' &&
                    `Décollage imminent dans ${crashState.countdown}s`}
                  {crashState.phase === 'FLYING' && 'Fusée Ragdoll en ascension — Encaissez à temps !'}
                  {crashState.phase === 'CRASHED' && 'CRASH ! La fusée a explosé'}
                </div>

                <div
                  className={`text-5xl sm:text-6xl font-mono-num font-extrabold tracking-tight ${
                    crashState.phase === 'CRASHED'
                      ? 'text-red-500'
                      : crashState.phase === 'FLYING'
                      ? 'text-amber-400'
                      : 'text-white'
                  }`}
                >
                  {crashState.multiplier.toFixed(2)}x
                </div>

                {/* Recent Crash Multipliers */}
                <div className="absolute bottom-3 left-4 right-4 flex items-center gap-2 overflow-x-auto">
                  <span className="text-xs text-slate-400 shrink-0">Récents :</span>
                  {crashState.history.map((m, i) => (
                    <span
                      key={i}
                      className={`px-2 py-0.5 rounded text-xs font-mono-num font-semibold ${
                        m >= 2.0
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {m.toFixed(2)}x
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 border border-white/10">
                <div className="space-y-1">
                  <div className="text-xs text-slate-400">Joueurs en vol sur ce tour :</div>
                  <div className="flex flex-wrap gap-3">
                    {Object.keys(crashState.bets).length === 0 ? (
                      <span className="text-xs text-slate-500">Aucun passager inscrit</span>
                    ) : (
                      Object.entries(crashState.bets).map(([pid, b]) => (
                        <span
                          key={pid}
                          className={`text-xs font-medium ${
                            b.cashedOut ? 'text-emerald-400' : 'text-amber-300'
                          }`}
                        >
                          {b.playerName}: {b.amount} €{' '}
                          {b.cashedOut ? `(Éjecté à ${b.cashoutMultiplier?.toFixed(2)}x)` : '(En vol)'}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  {crashState.phase === 'BETTING' && !crashState.bets[myPlayerId] && (
                    <button
                      type="button"
                      onClick={() => {
                        soundFX.playChipClick();
                        onCrashBet(chipAmount);
                      }}
                      className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm"
                    >
                      Miser {chipAmount} € pour le prochain décollage
                    </button>
                  )}
                  {crashState.phase === 'FLYING' &&
                    crashState.bets[myPlayerId] &&
                    !crashState.bets[myPlayerId].cashedOut && (
                      <button
                        type="button"
                        onClick={() => {
                          soundFX.playWinChime(true);
                          onCrashCashout();
                        }}
                        className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm animate-pulse"
                      >
                        Encaisser maintenant (
                        {(crashState.bets[myPlayerId].amount * crashState.multiplier).toFixed(2)} €)
                      </button>
                    )}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* GAME 5: PLINKO PHYSIQUE                                        */}
          {/* ============================================================== */}
          {stationId === 'plinko' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900 border border-pink-500/30 flex flex-col items-center">
                {/* Pyramid Pegs Visual */}
                <div className="space-y-2.5 my-2">
                  {Array.from({ length: 10 }, (_, r) => (
                    <div key={r} className="flex items-center justify-center gap-4">
                      {Array.from({ length: r + 2 }, (__, c) => {
                        const isBallHere =
                          activeBallRow === r && Math.min(r + 1, Math.max(0, activeBallCol - (5 - Math.floor(r / 2)))) === c;
                        return (
                          <div
                            key={c}
                            className={`w-2.5 h-2.5 rounded-full transition-transform ${
                              isBallHere
                                ? 'bg-[#D4AF37] scale-150 ring-4 ring-[#D4AF37]/40'
                                : 'bg-slate-600'
                            }`}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>

                {/* Multiplier Buckets */}
                <div className="grid grid-cols-11 gap-1 w-full mt-4">
                  {PLINKO_BUCKETS.map((m, idx) => (
                    <div
                      key={idx}
                      className={`py-2 rounded-lg text-center font-mono-num font-bold text-xs border ${
                        m >= 9
                          ? 'bg-pink-600 text-white border-pink-400'
                          : m >= 2
                          ? 'bg-amber-500 text-slate-950 border-amber-300'
                          : 'bg-slate-800 text-slate-300 border-white/10'
                      }`}
                    >
                      {m}x
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={dropPlinkoBall}
                  className="mt-6 px-6 py-3 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-sm shadow-lg"
                >
                  Lâcher une bille d’or ({chipAmount} €)
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/70 border border-white/10 space-y-3">
                <h3 className="text-sm font-semibold text-white">Derniers Lancers Plinko</h3>
                {plinkoDrops.length === 0 ? (
                  <p className="text-xs text-slate-400">Lâchez des billes pour voir vos gains en direct.</p>
                ) : (
                  <div className="space-y-2">
                    {plinkoDrops.map((d) => (
                      <div
                        key={d.id}
                        className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800/80 text-xs font-mono-num"
                      >
                        <span className="text-slate-300">Panier {d.mult}x</span>
                        <span className={d.mult >= 1 ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                          +{d.payout.toFixed(2)} €
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* GAME 6: MINES DIAMANT 5x5                                      */}
          {/* ============================================================== */}
          {stationId === 'mines' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-5 rounded-2xl bg-slate-900 border border-cyan-500/30 space-y-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">
                    Nombre de Mines sur la grille (25 cases)
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 3, 5, 10].map((cnt) => (
                      <button
                        key={cnt}
                        type="button"
                        disabled={minesActive}
                        onClick={() => setMinesCount(cnt)}
                        className={`py-2 rounded-lg text-xs font-bold ${
                          minesCount === cnt
                            ? 'bg-cyan-500 text-slate-950'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {cnt} {cnt === 1 ? 'Mine' : 'Mines'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-white/10 space-y-1">
                  <div className="text-xs text-slate-400">Multiplicateur Actuel</div>
                  <div className="text-2xl font-mono-num font-bold text-cyan-400">
                    {getMinesMultiplier(minesRevealed.size, minesCount).toFixed(2)}x
                  </div>
                </div>

                {!minesActive ? (
                  <button
                    type="button"
                    onClick={startMinesGame}
                    className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm"
                  >
                    Démarrer la grille ({chipAmount} €)
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={minesRevealed.size === 0}
                    onClick={cashoutMines}
                    className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-sm"
                  >
                    Encaisser (
                    {(minesBet * getMinesMultiplier(minesRevealed.size, minesCount)).toFixed(2)} €)
                  </button>
                )}
              </div>

              <div className="md:col-span-2 grid grid-cols-5 gap-2.5 p-5 rounded-2xl bg-slate-900 border border-white/10">
                {Array.from({ length: 25 }, (_, idx) => {
                  const isRev = minesRevealed.has(idx);
                  const isBomb = minesBombs.has(idx);
                  const showAll = !minesActive && (minesExploded !== null || minesRevealed.size > 0);

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={!minesActive || isRev}
                      onClick={() => clickMineTile(idx)}
                      className={`h-14 sm:h-16 rounded-xl font-bold text-xl flex items-center justify-center transition-all border ${
                        minesExploded === idx
                          ? 'bg-red-600 border-red-400 text-white scale-95'
                          : isRev
                          ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300'
                          : showAll && isBomb
                          ? 'bg-red-950/60 border-red-500/30 text-red-300'
                          : 'bg-slate-800 hover:bg-slate-700 border-white/10 text-slate-400'
                      }`}
                    >
                      {minesExploded === idx || (showAll && isBomb) ? (
                        <Flame className="w-6 h-6 text-red-400" />
                      ) : isRev ? (
                        <Sparkles className="w-6 h-6 text-emerald-400" />
                      ) : (
                        '?'
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* GAME 7: CHICKEN RUN TRAVERSÉE                                  */}
          {/* ============================================================== */}
          {stationId === 'chicken' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 border border-orange-500/30">
                <div className="flex items-center gap-2">
                  {(['easy', 'medium', 'hard'] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      disabled={chickenActive}
                      onClick={() => setChickenDiff(d)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize ${
                        chickenDiff === d
                          ? 'bg-orange-500 text-slate-950'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      Risque {d === 'easy' ? 'Faible' : d === 'medium' ? 'Moyen' : 'Extrême'}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  {!chickenActive ? (
                    <button
                      type="button"
                      onClick={startChickenRun}
                      className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold text-sm"
                    >
                      Lancer le Poulet ({chipAmount} €)
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={advanceChickenLane}
                        className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm"
                      >
                        Avancer d’une voie
                      </button>
                      {chickenLane >= 0 && (
                        <button
                          type="button"
                          onClick={cashoutChickenRun}
                          className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm"
                        >
                          Encaisser (
                          {(chickenBet * chickenLanesMultipliers[chickenDiff][chickenLane]).toFixed(
                            2
                          )}{' '}
                          €)
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-6 gap-2.5 p-5 rounded-2xl bg-[#1C1917] border border-white/10">
                {chickenLanesMultipliers[chickenDiff].map((mult, idx) => {
                  const isCurrent = chickenLane === idx;
                  const isPassed = chickenLane > idx;
                  const isTrapped = chickenTrapLane === idx;
                  return (
                    <div
                      key={idx}
                      className={`h-44 rounded-xl border flex flex-col items-center justify-between p-3 transition-all ${
                        isTrapped
                          ? 'bg-red-950/80 border-red-500'
                          : isCurrent
                          ? 'bg-orange-500/20 border-orange-400 ring-2 ring-orange-400'
                          : isPassed
                          ? 'bg-emerald-950/40 border-emerald-500/40'
                          : 'bg-slate-900/80 border-white/10'
                      }`}
                    >
                      <span className="text-xs text-slate-400">Voie {idx + 1}</span>
                      <div className="text-3xl">
                        {isTrapped ? '🍗' : isCurrent ? '🐔' : isPassed ? '✅' : '🛣️'}
                      </div>
                      <span className="font-mono-num font-bold text-sm text-orange-300">
                        {mult}x
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* GAME 8: LUCKY DICE 100                                         */}
          {/* ============================================================== */}
          {stationId === 'dice' && (
            <div className="p-6 rounded-2xl bg-slate-900 border border-violet-500/30 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-950 border border-white/10">
                  <div className="text-xs text-slate-400">Multiplicateur</div>
                  <div className="text-2xl font-mono-num font-bold text-violet-400">
                    {diceMultiplier.toFixed(2)}x
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-950 border border-white/10">
                  <div className="text-xs text-slate-400">Probabilité de Gain</div>
                  <div className="text-2xl font-mono-num font-bold text-emerald-400">
                    {diceWinProbability}%
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-950 border border-white/10">
                  <div className="text-xs text-slate-400">Dernier Jet</div>
                  <div className="text-2xl font-mono-num font-bold text-white">
                    {lastDiceRoll !== null ? lastDiceRoll.toFixed(2) : '—'}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-medium text-slate-300">
                  <span>0</span>
                  <span>Seuil Sélectionné : {diceTarget}</span>
                  <span>100</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={95}
                  value={diceTarget}
                  onChange={(e) => setDiceTarget(Number(e.target.value))}
                  className="w-full accent-violet-500 cursor-pointer h-3 rounded-lg bg-slate-800"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDiceMode('under')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold ${
                      diceMode === 'under'
                        ? 'bg-violet-500 text-white'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    En-dessous de {diceTarget}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiceMode('over')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold ${
                      diceMode === 'over'
                        ? 'bg-violet-500 text-white'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    Au-dessus de {diceTarget}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={rollLuckyDice}
                  className="px-6 py-3 rounded-xl bg-violet-500 hover:bg-violet-400 text-white font-bold text-sm"
                >
                  Lancer le Dé ({chipAmount} €)
                </button>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* GAME 9: GRAND MONTE-CARLO SLOTS                                */}
          {/* ============================================================== */}
          {stationId === 'slots' && (
            <div className="p-6 rounded-2xl bg-gradient-to-b from-[#450A0A] to-[#111827] border-2 border-[#D4AF37]/60 space-y-6">
              <div className="grid grid-cols-5 gap-2.5 p-4 rounded-xl bg-black/50 border border-[#D4AF37]/40">
                {slotsGrid.map((row, rIdx) =>
                  row.map((sym, cIdx) => (
                    <div
                      key={`${rIdx}-${cIdx}`}
                      className={`h-20 sm:h-24 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center text-3xl sm:text-4xl shadow-inner ${
                        slotsSpinning ? 'animate-pulse scale-95' : ''
                      }`}
                    >
                      {sym}
                    </div>
                  ))
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap gap-3 text-xs text-slate-300">
                  {SLOT_SYMBOLS.map((s) => (
                    <span key={s.name} className="px-2.5 py-1 rounded bg-black/40 border border-white/10">
                      {s.icon} 3x={s.mult3}x · 5x={s.mult5}x
                    </span>
                  ))}
                </div>

                <button
                  type="button"
                  disabled={slotsSpinning}
                  onClick={spinSlots}
                  className="px-8 py-3.5 rounded-xl bg-[#D4AF37] hover:bg-[#E5C158] text-slate-950 font-extrabold text-sm shadow-xl"
                >
                  {slotsSpinning ? 'Rouleaux en cours...' : `Tourner (${chipAmount} €)`}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Universal Casino Chip Selector Bar (Bottom Footer of Modal) */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-3.5 bg-[#0B0F17] border-t border-white/10">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-[#D4AF37]" />
            <span className="text-xs text-slate-400">Jetons de Mise (€) :</span>
            {[5, 10, 25, 50, 100, 250, 500].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => {
                  soundFX.playChipClick();
                  setChipAmount(val);
                }}
                className={`px-3 py-1.5 rounded-lg font-mono-num text-xs font-bold transition-all ${
                  chipAmount === val
                    ? 'bg-[#D4AF37] text-[#0B0F17] scale-105 shadow-md'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {val} €
              </button>
            ))}
          </div>

          <div className="text-xs text-slate-400">
            Argent virtuel uniquement · Zéro transaction réelle
          </div>
        </div>
      </div>
    </div>
  );
};
