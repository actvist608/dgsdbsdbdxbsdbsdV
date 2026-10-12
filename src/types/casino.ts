export type GameStationId =
  | 'poker'
  | 'blackjack'
  | 'roulette'
  | 'crash'
  | 'plinko'
  | 'mines'
  | 'chicken'
  | 'dice'
  | 'slots'
  | 'bowling'
  | 'lasergame';

export type HatStyle =
  | 'none'
  | 'tophat'
  | 'crown'
  | 'cowboy'
  | 'cap'
  | 'viking'
  | 'astronaut'
  | 'halo'
  | 'chef'
  | 'pirate';

export type AccessoryStyle =
  | 'none'
  | 'sunglasses'
  | 'monocle'
  | 'bowtie'
  | 'cape'
  | 'wings'
  | 'goldchain'
  | 'jetpack'
  | 'beard';

export type AuraStyle = 'none' | 'gold_sparks' | 'neon_flame' | 'emerald_luck' | 'royal_stars';

export type ShopItemId =
  | 'firework_mortar'
  | 'cigarette'
  | 'water_gun'
  | 'bouncy_ball'
  | 'money_gun'
  | 'champagne'
  | 'laser_blaster'
  | 'golden_megaphone';

export interface ShopItemDefinition {
  id: ShopItemId;
  name: string;
  price: number;
  icon: string;
  description: string;
  actionLabel: string;
  color: string;
}

export const SHOP_ITEMS: ShopItemDefinition[] = [
  {
    id: 'cigarette',
    name: 'Cigarette / Cigare Monte-Carlo',
    price: 50,
    icon: '🚬',
    description: 'Fumable en 3D ! Crée des anneaux de fumée volumétriques et une braise rougeoyante à chaque bouffée.',
    actionLabel: 'Tirer une bouffée',
    color: '#F97316',
  },
  {
    id: 'water_gun',
    name: 'Pistolet à Eau Super-Splash',
    price: 150,
    icon: '🔫',
    description: 'Projetez un puissant jet d’eau 3D sur vos amis pour les faire glisser en ragdoll !',
    actionLabel: 'Arroser',
    color: '#06B6D4',
  },
  {
    id: 'bouncy_ball',
    name: 'Ballon Géant Rebonds Extrêmes',
    price: 200,
    icon: '⚽',
    description: 'Lancez un ballon physique dans le casino qui rebondit sur les tables et les joueurs.',
    actionLabel: 'Lancer un ballon',
    color: '#EC4899',
  },
  {
    id: 'firework_mortar',
    name: 'Mortier d’Artifice Impérial',
    price: 450,
    icon: '🎆',
    description: 'Pose un mortier pyrotechnique au sol qui tire une fusée géante explosant sous la coupole du casino !',
    actionLabel: 'Tirer un feu d’artifice',
    color: '#EF4444',
  },
  {
    id: 'champagne',
    name: 'Magnum Champagne Impérial',
    price: 600,
    icon: '🍾',
    description: 'Sabrez le champagne et déclenchez une fontaine de bulles dorées autour de votre bonhomme.',
    actionLabel: 'Sabrer le Champagne',
    color: '#10B981',
  },
  {
    id: 'money_gun',
    name: 'Canon à Billets Suprême (500€)',
    price: 1200,
    icon: '💸',
    description: 'Faites pleuvoir une tempête de billets de 500 € en 3D autour de la table pour célébrer vos victoires !',
    actionLabel: 'Faire pleuvoir les €',
    color: '#D4AF37',
  },
  {
    id: 'laser_blaster',
    name: 'Blaster Plasma Cyber-Arène',
    price: 850,
    icon: '⚡',
    description: 'Tire des rayons laser néon à travers tout le casino et marque des points au Laser Game.',
    actionLabel: 'Tirer au Laser',
    color: '#8B5CF6',
  },
  {
    id: 'golden_megaphone',
    name: 'Mégaphone d’Or VIP',
    price: 1500,
    icon: '📢',
    description: 'Émet une onde de choc dorée 3D qui fait sauter de joie les objets autour de vous.',
    actionLabel: 'Onde VIP',
    color: '#F59E0B',
  },
];

export interface CharacterCustomization {
  bodyColor: string;
  outfitColor: string;
  hat: HatStyle;
  accessory: AccessoryStyle;
  aura?: AuraStyle;
}

export interface PlayerState {
  id: string;
  name: string;
  roomId: string;
  balance: number; // in EUR (€)
  totalWon: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  rotationY: number;
  armSwingPhase: number;
  leftArmGrab: boolean;
  rightArmGrab: boolean;
  isJumping: boolean;
  isRagdollFlop: boolean;
  customization: CharacterCustomization;
  activeStation: GameStationId | null;
  seatIndex: number; // 0..5 seat around the 3D table
  equippedItem: ShopItemId | null;
  ownedItems: ShopItemId[];
  laserScore: number;
  lastDailyReward: number | null;
  emote?: string | null;
  emoteExpiresAt?: number;
}

export interface WorldItemEvent {
  id: string;
  playerId: string;
  playerName: string;
  itemId: ShopItemId;
  x: number;
  y: number;
  z: number;
  rotationY: number;
  targetPlayerId?: string;
  timestamp: number;
}

export interface TableVisualEvent {
  id: string;
  stationId: GameStationId;
  playerId: string;
  playerName: string;
  summary: string;
  winAmount: number;
  visualData?: {
    diceRoll?: number;
    plinkoBucket?: number;
    slotsGrid?: string[][];
    bowlingPinsDown?: number[];
    cards?: PlayingCard[];
    dealerCards?: PlayingCard[];
    chickenLane?: number;
  };
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderColor: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
  gameWinAmount?: number;
  gameName?: string;
}

export interface RoomInfo {
  id: string;
  name: string;
  playerCount: number;
  isCustom: boolean;
  createdAt: number;
}

// Shared Multiplayer Crash State per Room
export interface CrashGameState {
  phase: 'BETTING' | 'FLYING' | 'CRASHED';
  multiplier: number;
  countdown: number;
  history: number[];
  bets: {
    [playerId: string]: {
      playerName: string;
      amount: number;
      cashedOut: boolean;
      cashoutMultiplier?: number;
      profit?: number;
    };
  };
}

// Shared Multiplayer Roulette State per Room
export interface RouletteBet {
  type: 'number' | 'color' | 'parity' | 'dozen';
  value: string | number;
  amount: number;
}

export interface RouletteGameState {
  phase: 'BETTING' | 'SPINNING' | 'RESULT';
  countdown: number;
  winningNumber: number | null;
  history: number[];
  playerBets: {
    [playerId: string]: {
      playerName: string;
      bets: RouletteBet[];
      totalBet: number;
      lastWin?: number;
    };
  };
}

export interface PlayingCard {
  suit: '♠' | '♥' | '♦' | '♣';
  rank: '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
  value: number;
}

export interface StationDefinition {
  id: GameStationId;
  name: string;
  subtitle: string;
  category: 'Table' | 'Arcade' | 'Originals' | 'Complex';
  x: number;
  z: number;
  color: string;
  accentColor: string;
  minBet: number;
  maxMultiplier: string;
  description: string;
  camOffset: { x: number; y: number; z: number; lookY: number };
}

export const CASINO_STATIONS: StationDefinition[] = [
  {
    id: 'roulette',
    name: 'Roulette Royale 3D',
    subtitle: 'Cylindre Européen Live',
    category: 'Table',
    x: 0,
    z: -9,
    color: '#0F5132',
    accentColor: '#D4AF37',
    minBet: 5,
    maxMultiplier: '36x',
    description: 'Table 3D synchronisée entre tous les joueurs assis autour du cylindre.',
    camOffset: { x: 0, y: 5.2, z: 4.5, lookY: 1.2 },
  },
  {
    id: 'blackjack',
    name: 'Blackjack 21 VIP',
    subtitle: 'Table 3D Multi-Sièges · 3:2',
    category: 'Table',
    x: -14,
    z: -8,
    color: '#0F5132',
    accentColor: '#10B981',
    minBet: 10,
    maxMultiplier: '2.5x',
    description: 'Prenez place autour du sabot 3D face au croupier doré avec vos amis.',
    camOffset: { x: 0, y: 4.6, z: 4.2, lookY: 1.25 },
  },
  {
    id: 'poker',
    name: "Texas Hold'em Poker 3D",
    subtitle: 'Flop, Turn, River sur Tapis 3D',
    category: 'Table',
    x: 14,
    z: -8,
    color: '#1E3A5F',
    accentColor: '#3B82F6',
    minBet: 20,
    maxMultiplier: '50x',
    description: 'Affrontez le croupier avec cartes 3D distribuées directement sur le tapis.',
    camOffset: { x: 0, y: 4.6, z: 4.2, lookY: 1.25 },
  },
  {
    id: 'crash',
    name: 'Astronaut Crash 3D',
    subtitle: 'Fusée 3D Live en Direct',
    category: 'Originals',
    x: -16,
    z: 4,
    color: '#3B0764',
    accentColor: '#F59E0B',
    minBet: 5,
    maxMultiplier: '1000x',
    description: 'Regardez la fusée décoller physiquement en 3D et éjectez-vous avant l’explosion !',
    camOffset: { x: 0, y: 5.5, z: 6.2, lookY: 2.5 },
  },
  {
    id: 'plinko',
    name: 'Plinko Pyramide 3D',
    subtitle: 'Billes d’Or Physiques 3D',
    category: 'Originals',
    x: 16,
    z: 4,
    color: '#1E293B',
    accentColor: '#EC4899',
    minBet: 5,
    maxMultiplier: '29x',
    description: 'Lâchez des billes 3D qui rebondissent entre les chevilles lumineuses devant tous les joueurs.',
    camOffset: { x: 0, y: 4.8, z: 5.2, lookY: 2.1 },
  },
  {
    id: 'mines',
    name: 'Mines Diamant 3D',
    subtitle: 'Dalles Holographiques 5×5',
    category: 'Originals',
    x: -11,
    z: 14,
    color: '#0F172A',
    accentColor: '#06B6D4',
    minBet: 5,
    maxMultiplier: '24.7x',
    description: 'Révélez les émeraudes 3D sur le plateau tactique sans déclencher les mines.',
    camOffset: { x: 0, y: 5.0, z: 4.2, lookY: 1.2 },
  },
  {
    id: 'chicken',
    name: 'Chicken Run 3D',
    subtitle: 'Traversée Poulet Ragdoll 3D',
    category: 'Arcade',
    x: 0,
    z: 15,
    color: '#3E2723',
    accentColor: '#F97316',
    minBet: 5,
    maxMultiplier: '45.5x',
    description: 'Faites bondir le poulet 3D sur les voies de la table sous les yeux du salon !',
    camOffset: { x: 0, y: 4.8, z: 4.5, lookY: 1.3 },
  },
  {
    id: 'dice',
    name: 'Lucky Dice 100 3D',
    subtitle: 'Lancer de Dé Géant 3D',
    category: 'Originals',
    x: 11,
    z: 14,
    color: '#1E1B4B',
    accentColor: '#8B5CF6',
    minBet: 5,
    maxMultiplier: '98x',
    description: 'Le cube néon 3D tourne et s’illumine sur la table à chaque lancer.',
    camOffset: { x: 0, y: 4.6, z: 4.2, lookY: 1.5 },
  },
  {
    id: 'slots',
    name: 'Grand Monte-Carlo Slots 3D',
    subtitle: 'Rouleaux Mécaniques 3D',
    category: 'Arcade',
    x: 0,
    z: -20,
    color: '#450A0A',
    accentColor: '#EF4444',
    minBet: 5,
    maxMultiplier: '120x',
    description: 'Machine à sous monumentale 3D avec bras mécanique et pluie de pièces.',
    camOffset: { x: 0, y: 4.2, z: 5.0, lookY: 2.0 },
  },
  {
    id: 'bowling',
    name: 'Monte-Carlo VIP Bowling 3D',
    subtitle: '2 Pistes Néon · 10 Quilles 3D',
    category: 'Complex',
    x: -27,
    z: -2,
    color: '#0F172A',
    accentColor: '#38BDF8',
    minBet: 15,
    maxMultiplier: '10x Strike',
    description: 'Ajustez l’angle et la puissance pour envoyer la boule 3D fracasser les 10 quilles !',
    camOffset: { x: 0, y: 4.2, z: 7.5, lookY: 1.2 },
  },
  {
    id: 'lasergame',
    name: 'Cyber Laser Game Arena 3D',
    subtitle: 'Arène Néon Multijoueur & Cibles',
    category: 'Complex',
    x: 27,
    z: -2,
    color: '#090D16',
    accentColor: '#A855F7',
    minBet: 10,
    maxMultiplier: '5x Tir Précis',
    description: 'Tirez des rayons laser 3D sur les drones cibles et les joueurs dans l’arène néon pour gagner des € !',
    camOffset: { x: 0, y: 5.2, z: 6.5, lookY: 1.8 },
  },
];
