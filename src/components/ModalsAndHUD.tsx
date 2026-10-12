import React, { useState, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  AccessoryStyle,
  CASINO_STATIONS,
  CharacterCustomization,
  ChatMessage,
  GameStationId,
  HatStyle,
  PlayerState,
  RoomInfo,
} from '../types/casino.ts';
import { soundFX } from '../utils/sound.ts';
import {
  Send,
  Copy,
  Check,
  Gift,
  Users,
  Trophy,
  Plus,
  Sparkles,
  UserCheck,
  Smile,
  X,
} from 'lucide-react';

// ============================================================================
// 1.RAGDOLL CUSTOMIZER MODAL
// ============================================================================
interface RagdollCustomizerModalProps {
  name: string;
  customization: CharacterCustomization;
  onSave: (name: string, customization: CharacterCustomization) => void;
  onClose: () => void;
}

const BODY_COLORS = [
  { label: 'Pêche', hex: '#FDBA74' },
  { label: 'Ivoire', hex: '#FDE68A' },
  { label: 'Bronze', hex: '#B45309' },
  { label: 'Émeraude Jelly', hex: '#34D399' },
  { label: 'Azur Jelly', hex: '#60A5FA' },
  { label: 'Rose Bonbon', hex: '#F472B6' },
  { label: 'Or Pur', hex: '#D4AF37' },
];

const OUTFIT_COLORS = [
  { label: 'Smoking Bleu', hex: '#3B82F6' },
  { label: 'Velours Rouge', hex: '#DC2626' },
  { label: 'Émeraude Impérial', hex: '#10B981' },
  { label: 'Smoking Noir', hex: '#1E293B' },
  { label: 'Violet Royal', hex: '#8B5CF6' },
  { label: 'Or Monte-Carlo', hex: '#D4AF37' },
];

const HATS: Array<{ id: HatStyle; label: string }> = [
  { id: 'none', label: 'Aucun' },
  { id: 'tophat', label: 'Haut-de-Forme' },
  { id: 'crown', label: 'Couronne Royale' },
  { id: 'cowboy', label: 'Cowboy Texan' },
  { id: 'cap', label: 'Casquette' },
  { id: 'viking', label: 'Casque Viking' },
];

const ACCESSORIES: Array<{ id: AccessoryStyle; label: string }> = [
  { id: 'none', label: 'Aucun' },
  { id: 'sunglasses', label: 'Lunettes VIP' },
  { id: 'monocle', label: 'Monocle d’Or' },
  { id: 'bowtie', label: 'Nœud Papillon' },
  { id: 'cape', label: 'Cape Rouge' },
];

export const RagdollCustomizerModal: React.FC<RagdollCustomizerModalProps> = ({
  name,
  customization,
  onSave,
  onClose,
}) => {
  const [draftName, setDraftName] = useState(name);
  const [draftCust, setDraftCust] = useState<CharacterCustomization>(customization);

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    soundFX.playWinChime(false);
    onSave(draftName.trim() || 'Joueur VIP', draftCust);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <form
        onSubmit={handleApply}
        className="w-full max-w-lg rounded-2xl bg-[#111827] border border-white/15 shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 bg-[#0B0F17] border-b border-white/10">
          <h2 className="text-lg font-bold text-white">Vestiaire Ragdoll 3D</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[78vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Pseudonyme dans le Salon
            </label>
            <input
              type="text"
              maxLength={22}
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
              placeholder="Votre pseudonyme..."
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Couleur du Bonhomme (Style Human Fall Flat)
            </label>
            <div className="flex flex-wrap gap-2.5">
              {BODY_COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setDraftCust({ ...draftCust, bodyColor: c.hex })}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                    draftCust.bodyColor === c.hex
                      ? 'border-[#D4AF37] bg-white/10 text-white scale-105'
                      : 'border-white/10 bg-slate-900 text-slate-400'
                  }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-white/20"
                    style={{ backgroundColor: c.hex }}
                  />
                  <span>{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Couleur du Costume
            </label>
            <div className="flex flex-wrap gap-2.5">
              {OUTFIT_COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setDraftCust({ ...draftCust, outfitColor: c.hex })}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                    draftCust.outfitColor === c.hex
                      ? 'border-[#D4AF37] bg-white/10 text-white scale-105'
                      : 'border-white/10 bg-slate-900 text-slate-400'
                  }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-white/20"
                    style={{ backgroundColor: c.hex }}
                  />
                  <span>{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Chapeau & Coiffe 3D
            </label>
            <div className="grid grid-cols-3 gap-2">
              {HATS.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => setDraftCust({ ...draftCust, hat: h.id })}
                  className={`py-2 px-3 rounded-lg border text-xs font-medium ${
                    draftCust.hat === h.id
                      ? 'bg-[#D4AF37] text-slate-950 border-[#D4AF37] font-bold'
                      : 'bg-slate-900 text-slate-300 border-white/10 hover:bg-slate-800'
                  }`}
                >
                  {h.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Accessoire de Gala
            </label>
            <div className="grid grid-cols-3 gap-2">
              {ACCESSORIES.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setDraftCust({ ...draftCust, accessory: a.id })}
                  className={`py-2 px-3 rounded-lg border text-xs font-medium ${
                    draftCust.accessory === a.id
                      ? 'bg-[#D4AF37] text-slate-950 border-[#D4AF37] font-bold'
                      : 'bg-slate-900 text-slate-300 border-white/10 hover:bg-slate-800'
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-[#0B0F17] border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
          >
            Annuler
          </button>
          <button
            type="submit"
            className="px-5 py-2 rounded-lg bg-[#D4AF37] hover:bg-[#E5C158] text-slate-950 text-xs font-bold"
          >
            Enregistrer mon Bonhomme
          </button>
        </div>
      </form>
    </div>
  );
};

// ============================================================================
// 2. CUSTOM ROOMS & INVITE LINK MODAL
// ============================================================================
interface RoomsManagerModalProps {
  currentRoomId: string;
  rooms: RoomInfo[];
  onJoinRoom: (roomId: string, customName?: string) => void;
  onClose: () => void;
}

export const RoomsManagerModal: React.FC<RoomsManagerModalProps> = ({
  currentRoomId,
  rooms,
  onJoinRoom,
  onClose,
}) => {
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomCode, setNewRoomCode] = useState('');
  const [copied, setCopied] = useState(false);

  const shareUrl = `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(
    currentRoomId
  )}`;

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    soundFX.playChipClick();
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCreateCustomRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const code =
      newRoomCode.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '') ||
      `amis-${Math.random().toString(36).substring(2, 6)}`;
    const title = newRoomName.trim() || `Salon de ${code.toUpperCase()}`;
    onJoinRoom(code, title);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div className="w-full max-w-xl rounded-2xl bg-[#111827] border border-white/15 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 bg-[#0B0F17] border-b border-white/10">
          <h2 className="text-lg font-bold text-white">Salons Multijoueurs & Lien d’Amis</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Invite Friends with Exact Same Link */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-[#D4AF37]/40 space-y-2.5">
            <div className="text-xs font-semibold text-[#D4AF37]">
              Inviter vos amis dans votre salon actuel (#{currentRoomId})
            </div>
            <p className="text-xs text-slate-300">
              Tous les amis qui ouvrent ce lien rejoignent instantanément le même casino 3D, voient votre bonhomme ragdoll et jouent sur les mêmes tables en direct.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-xs font-mono-num text-slate-200"
              />
              <button
                type="button"
                onClick={handleCopyInvite}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#D4AF37] hover:bg-[#E5C158] text-slate-950 text-xs font-bold shrink-0"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copié !' : 'Copier le lien'}</span>
              </button>
            </div>
          </div>

          {/* Active Rooms List */}
          <div className="space-y-2.5">
            <div className="text-xs font-semibold text-slate-300">Salons Publics & Privés Actifs</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {rooms.map((r) => {
                const isCurrent = r.id === currentRoomId;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      if (!isCurrent) {
                        onJoinRoom(r.id, r.name);
                        onClose();
                      }
                    }}
                    className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                      isCurrent
                        ? 'bg-[#D4AF37]/15 border-[#D4AF37] text-white'
                        : 'bg-slate-900 hover:bg-slate-800 border-white/10 text-slate-200'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold">{r.name}</div>
                      <div className="text-[11px] text-slate-400">Code : #{r.id}</div>
                    </div>
                    <div className="text-xs font-mono-num text-[#D4AF37] font-semibold">
                      {r.playerCount} joueur{r.playerCount > 1 ? 's' : ''}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Create Custom Private Room */}
          <form
            onSubmit={handleCreateCustomRoom}
            className="p-4 rounded-xl bg-slate-900/60 border border-white/10 space-y-3"
          >
            <div className="text-xs font-semibold text-white flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-[#D4AF37]" />
              <span>Créer une Salle de Jeu Personnalisée</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Nom du salon (ex: Soirée Poker)"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                className="px-3 py-2 rounded-lg bg-slate-950 border border-white/15 text-xs text-white"
              />
              <input
                type="text"
                placeholder="Code secret (ex: amis-vip)"
                value={newRoomCode}
                onChange={(e) => setNewRoomCode(e.target.value)}
                className="px-3 py-2 rounded-lg bg-slate-950 border border-white/15 text-xs text-white"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
            >
              Créer et Rejoindre la Salle
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 3. DAILY REWARDS WHEEL & FREE REFILL MODAL
// ============================================================================
interface DailyRewardModalProps {
  lastDailyReward: number | null;
  balance: number;
  onClaimReward: (amount: number, isDaily: boolean) => void;
  onClose: () => void;
}

const WHEEL_PRIZES = [250, 500, 750, 1000, 1500, 2500, 5000];

export const DailyRewardModal: React.FC<DailyRewardModalProps> = ({
  lastDailyReward,
  balance,
  onClaimReward,
  onClose,
}) => {
  const [spinning, setSpinning] = useState(false);
  const [wonPrize, setWonPrize] = useState<number | null>(null);

  const now = Date.now();
  const cooldownMs = 24 * 60 * 60 * 1000;
  const canClaimDaily = !lastDailyReward || now - lastDailyReward >= cooldownMs;

  const spinDailyWheel = () => {
    if (!canClaimDaily || spinning) return;
    setSpinning(true);
    soundFX.playChipClick();

    setTimeout(() => {
      const prize = WHEEL_PRIZES[Math.floor(Math.random() * WHEEL_PRIZES.length)];
      setWonPrize(prize);
      setSpinning(false);
      onClaimReward(prize, true);
      soundFX.playWinChime(true);
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
    }, 900);
  };

  const claimBailout = () => {
    soundFX.playWinChime(false);
    onClaimReward(1000, false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div className="w-full max-w-md rounded-2xl bg-[#111827] border border-white/15 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 bg-[#0B0F17] border-b border-white/10">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Gift className="w-5 h-5 text-[#D4AF37]" />
            <span>Coffre & Récompense Quotidienne</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 text-center">
          <div className="p-5 rounded-2xl bg-gradient-to-b from-amber-500/15 to-slate-900 border border-[#D4AF37]/40 space-y-3">
            <div className="text-xs uppercase tracking-wider text-[#D4AF37] font-semibold">
              Roue de la Fortune Quotidienne
            </div>
            <div className="text-3xl font-mono-num font-extrabold text-white">
              {wonPrize
                ? `+${wonPrize.toLocaleString('fr-FR')} € !`
                : spinning
                ? 'Tirage en cours...'
                : '250 € à 5 000 €'}
            </div>
            <p className="text-xs text-slate-300">
              Tournez la roue chaque jour pour recevoir des jetons virtuels gratuits en euros.
            </p>
            <button
              type="button"
              disabled={!canClaimDaily || spinning}
              onClick={spinDailyWheel}
              className="w-full py-3 rounded-xl bg-[#D4AF37] hover:bg-[#E5C158] disabled:opacity-40 text-slate-950 font-bold text-sm shadow-lg"
            >
              {canClaimDaily
                ? 'Tourner la Roue Quotidienne'
                : 'Déjà réclamé aujourd’hui (Revenez demain)'}
            </button>
          </div>

          {/* Instant VIP Refill if low on virtual funds */}
          <div className="p-4 rounded-xl bg-slate-900 border border-white/10 space-y-2.5">
            <div className="text-xs font-semibold text-emerald-400">
              Ravitaillement Gratuit de Jetons Virtuels
            </div>
            <p className="text-xs text-slate-400">
              Ce jeu utilise exclusivement de l’argent virtuel (€). Si votre solde est bas, rechargez gratuitement 1 000 € à tout moment.
            </p>
            <button
              type="button"
              onClick={claimBailout}
              className="w-full py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-white/10"
            >
              Recevoir +1 000 € de Jetons Virtuels
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 4. FLOATING CHAT, EMOTES, LIVE LEADERBOARD & MOBILE TOUCH CONTROLS
// ============================================================================
interface CasinoFloatingHUDProps {
  myPlayerId: string;
  players: PlayerState[];
  chatMessages: ChatMessage[];
  nearStation: GameStationId | null;
  activeTab: 'chat' | 'leaderboard' | 'games' | null;
  setActiveTab: (t: 'chat' | 'leaderboard' | 'games' | null) => void;
  onSendChat: (text: string) => void;
  onSendEmote: (emote: string) => void;
  onSelectStation: (id: GameStationId) => void;
  onJoystickChange: (dx: number, dz: number) => void;
  onTriggerJump: () => void;
  onTriggerFlop: () => void;
  onToggleGrab: (left: boolean, right: boolean) => void;
}

export const CasinoFloatingHUD: React.FC<CasinoFloatingHUDProps> = ({
  myPlayerId,
  players,
  chatMessages,
  nearStation,
  activeTab,
  setActiveTab,
  onSendChat,
  onSendEmote,
  onSelectStation,
  onJoystickChange,
  onTriggerJump,
  onTriggerFlop,
  onToggleGrab,
}) => {
  const [chatInput, setChatInput] = useState('');
  const [grabActive, setGrabActive] = useState(false);
  const joyRef = useRef<HTMLDivElement | null>(null);
  const [joyKnob, setJoyKnob] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const sortedLeaderboard = [...players].sort((a, b) => b.balance - a.balance);
  const nearStationObj = CASINO_STATIONS.find((s) => s.id === nearStation);

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendChat(chatInput);
    setChatInput('');
  };

  // Virtual Joystick Touch Handlers
  const handleJoyMove = (clientX: number, clientY: number) => {
    if (!joyRef.current) return;
    const rect = joyRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = rect.width / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxR) {
      dx = (dx / dist) * maxR;
      dy = (dy / dist) * maxR;
    }
    setJoyKnob({ x: dx, y: dy });
    onJoystickChange(dx / maxR, dy / maxR);
  };

  const resetJoystick = () => {
    setJoyKnob({ x: 0, y: 0 });
    onJoystickChange(0, 0);
  };

  return (
    <>
      {/* Proximity Action Prompt when standing near a 3D table */}
      {nearStationObj && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
          <button
            type="button"
            onClick={() => {
              soundFX.playChipClick();
              onSelectStation(nearStationObj.id);
            }}
            className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-[#0B0F17]/90 backdrop-blur-md border-2 border-[#D4AF37] shadow-2xl hover:scale-105 transition-transform"
          >
            <Sparkles className="w-5 h-5 text-[#D4AF37]" />
            <div className="text-left">
              <div className="text-xs text-[#D4AF37] font-semibold">
                Table à proximité · Cliquez pour ouvrir
              </div>
              <div className="text-sm font-bold text-white">{nearStationObj.name}</div>
            </div>
          </button>
        </div>
      )}

      {/* Right Side Collapsible Panel: Live Chat / Leaderboard / Quick Games */}
      {activeTab && (
        <div className="fixed top-20 right-4 z-30 w-80 sm:w-96 max-h-[calc(100vh-140px)] flex flex-col rounded-2xl bg-[#0B0F17]/85 backdrop-blur-md border border-white/15 shadow-2xl overflow-hidden pointer-events-auto">
          {/* Segmented Control Header */}
          <div className="flex items-center justify-between p-2 bg-slate-900/90 border-b border-white/10">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('chat')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === 'chat'
                    ? 'bg-[#D4AF37] text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Chat ({chatMessages.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('leaderboard')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === 'leaderboard'
                    ? 'bg-[#D4AF37] text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Classement ({players.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('games')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === 'games'
                    ? 'bg-[#D4AF37] text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                9 Jeux
              </button>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab(null)}
              className="p-1 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* TAB 1: REAL-TIME CHAT & EMOTES */}
          {activeTab === 'chat' && (
            <div className="flex flex-col h-96">
              <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
                {chatMessages.map((m) => (
                  <div
                    key={m.id}
                    className={`text-xs rounded-xl p-2.5 ${
                      m.isSystem
                        ? 'bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#F8FAFC]'
                        : 'bg-slate-900/80 border border-white/5 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span
                        className="font-bold"
                        style={{ color: m.isSystem ? '#D4AF37' : m.senderColor }}
                      >
                        {m.senderName}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono-num">
                        {new Date(m.timestamp).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="leading-relaxed break-words">{m.text}</p>
                  </div>
                ))}
              </div>

              {/* Quick Ragdoll Emotes Bar */}
              <div className="flex items-center justify-between px-3 py-1.5 bg-slate-950/80 border-t border-white/5">
                {['👋 Salut !', '🔥 Tout sur le Rouge !', '💎 Jackpot !', '🤣 Ragdoll !'].map(
                  (em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => onSendEmote(em)}
                      className="text-[11px] text-slate-300 hover:text-[#D4AF37] transition-colors whitespace-nowrap"
                    >
                      {em}
                    </button>
                  )
                )}
              </div>

              <form
                onSubmit={handleChatSubmit}
                className="flex items-center gap-2 p-2.5 bg-slate-950 border-t border-white/10"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Écrire au salon..."
                  className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                />
                <button
                  type="submit"
                  className="p-2 rounded-lg bg-[#D4AF37] hover:bg-[#E5C158] text-slate-950"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: LIVE LEADERBOARD IN EUR */}
          {activeTab === 'leaderboard' && (
            <div className="p-3.5 space-y-2 max-h-96 overflow-y-auto">
              <div className="text-xs text-slate-400 mb-2">
                Classement en direct des fortunes du salon (€)
              </div>
              {sortedLeaderboard.map((p, idx) => (
                <div
                  key={p.id}
                  className={`flex items-center justify-between p-2.5 rounded-xl border ${
                    p.id === myPlayerId
                      ? 'bg-[#D4AF37]/15 border-[#D4AF37]/50'
                      : 'bg-slate-900/70 border-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 text-xs font-mono-num font-bold text-[#D4AF37]">
                      #{idx + 1}
                    </span>
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: p.customization.outfitColor }}
                    />
                    <div className="truncate">
                      <div className="text-xs font-bold text-white truncate">
                        {p.name} {p.id === myPlayerId && '(Vous)'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {p.activeStation
                          ? `Joue à ${p.activeStation.toUpperCase()}`
                          : 'Se promène dans le casino'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-mono-num font-bold text-emerald-400">
                      {p.balance.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                    </div>
                    <div className="text-[10px] font-mono-num text-slate-400">
                      Gains : +{p.totalWon.toLocaleString('fr-FR')} €
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: ALL 9 GAMES DIRECTORY */}
          {activeTab === 'games' && (
            <div className="p-3.5 space-y-2 max-h-96 overflow-y-auto">
              {CASINO_STATIONS.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => {
                    soundFX.playChipClick();
                    onSelectStation(st.id);
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-left transition-colors"
                >
                  <div>
                    <div className="text-xs font-bold text-white">{st.name}</div>
                    <div className="text-[11px] text-slate-400">
                      {st.subtitle} · Mise min {st.minBet} €
                    </div>
                  </div>
                  <span className="text-xs font-mono-num font-bold text-[#D4AF37]">
                    Max {st.maxMultiplier}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bottom Controls Helper & Mobile Touch Ragdoll Joystick */}
      <div className="fixed bottom-4 left-4 right-4 z-20 flex items-end justify-between pointer-events-none">
        {/* Virtual Joystick for Touch / Mouse Drag */}
        <div
          ref={joyRef}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            handleJoyMove(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => {
            if (e.buttons > 0) handleJoyMove(e.clientX, e.clientY);
          }}
          onPointerUp={resetJoystick}
          onPointerCancel={resetJoystick}
          className="pointer-events-auto w-24 h-24 rounded-full bg-[#0B0F17]/75 backdrop-blur-md border border-white/15 flex items-center justify-center touch-none select-none shadow-xl"
          title="Joystick de déplacement Ragdoll"
        >
          <div
            style={{
              transform: `translate3d(${joyKnob.x}px, ${joyKnob.y}px, 0)`,
            }}
            className="w-10 h-10 rounded-full bg-[#D4AF37] shadow-md border-2 border-white/40 transition-transform duration-75"
          />
        </div>

        {/* Desktop Keyboard Hint Pill (Unobtrusive) */}
        <div className="hidden lg:flex items-center gap-4 px-4 py-2 rounded-xl bg-[#0B0F17]/75 backdrop-blur-md border border-white/10 text-xs text-slate-300">
          <span>
            <strong className="text-white">ZQSD / Flèches</strong> : Marcher
          </span>
          <span>·</span>
          <span>
            <strong className="text-white">Espace</strong> : Saut Ragdoll
          </span>
          <span>·</span>
          <span>
            <strong className="text-white">F</strong> : Plongeon Ragdoll
          </span>
          <span>·</span>
          <span>
            <strong className="text-white">Clic / Q / E</strong> : Lever les bras
          </span>
        </div>

        {/* Ragdoll Physics Action Buttons (Mobile & Desktop) */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const next = !grabActive;
              setGrabActive(next);
              onToggleGrab(next, next);
            }}
            className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold shadow-lg transition-all ${
              grabActive
                ? 'bg-[#D4AF37] text-slate-950 border-[#D4AF37]'
                : 'bg-[#0B0F17]/85 text-white border-white/15 hover:border-white/30'
            }`}
          >
            Bras Levés
          </button>
          <button
            type="button"
            onClick={onTriggerFlop}
            className="px-3.5 py-2.5 rounded-xl bg-[#0B0F17]/85 hover:bg-slate-800 text-amber-300 border border-white/15 text-xs font-bold shadow-lg"
          >
            Ragdoll Flop
          </button>
          <button
            type="button"
            onClick={onTriggerJump}
            className="px-4 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#E5C158] text-slate-950 text-xs font-bold shadow-lg"
          >
            Sauter
          </button>
        </div>
      </div>
    </>
  );
};
