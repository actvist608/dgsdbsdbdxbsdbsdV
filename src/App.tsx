/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  CharacterCustomization,
  ChatMessage,
  CrashGameState,
  GameStationId,
  PlayerState,
  RoomInfo,
  RouletteBet,
  RouletteGameState,
} from './types/casino.ts';
import { CasinoWorld3D } from './components/CasinoWorld3D.tsx';
import { CasinoGameModal } from './components/CasinoGameModal.tsx';
import {
  CasinoFloatingHUD,
  DailyRewardModal,
  RagdollCustomizerModal,
  RoomsManagerModal,
} from './components/ModalsAndHUD.tsx';
import { soundFX } from './utils/sound.ts';

const STORAGE_KEY_PROFILE = 'mc_ragdoll_casino_profile_v1';

interface SavedProfile {
  playerId: string;
  name: string;
  balance: number;
  totalWon: number;
  lastDailyReward: number | null;
  customization: CharacterCustomization;
}

function loadSavedProfile(): SavedProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROFILE);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.playerId) return parsed;
    }
  } catch {
    // ignore storage errors
  }
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  return {
    playerId: `p-${Math.random().toString(36).substring(2, 10)}`,
    name: ` Flambeur_${randomSuffix}`.trim(),
    balance: 2500,
    totalWon: 0,
    lastDailyReward: null,
    customization: {
      bodyColor: '#FDBA74',
      outfitColor: '#3B82F6',
      hat: 'tophat',
      accessory: 'sunglasses',
    },
  };
}

export default function App() {
  const [profile, setProfile] = useState<SavedProfile>(() => loadSavedProfile());
  const [roomId, setRoomId] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('room')?.trim().toLowerCase() || 'grand-salon';
  });

  const [players, setPlayers] = useState<PlayerState[]>([]);
  const [roomsList, setRoomsList] = useState<RoomInfo[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [activeStation, setActiveStation] = useState<GameStationId | null>(null);
  const [nearStation, setNearStation] = useState<GameStationId | null>(null);

  // Modals & Right Drawer State
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [showRoomsModal, setShowRoomsModal] = useState(false);
  const [showDailyModal, setShowDailyModal] = useState(false);
  const [activeSideTab, setActiveSideTab] = useState<'chat' | 'leaderboard' | 'games' | null>(
    'chat'
  );
  const [copiedBanner, setCopiedBanner] = useState(false);

  // Shared Multiplayer Game States
  const [crashState, setCrashState] = useState<CrashGameState>({
    phase: 'BETTING',
    multiplier: 1.0,
    countdown: 6,
    history: [1.42, 2.85, 1.12, 6.4, 1.95],
    bets: {},
  });

  const [rouletteState, setRouletteState] = useState<RouletteGameState>({
    phase: 'BETTING',
    countdown: 12,
    winningNumber: null,
    history: [17, 0, 32, 8, 23, 14],
    playerBets: {},
  });

  // External controls for 3D Ragdoll Avatar
  const [joystick, setJoystick] = useState<{ dx: number; dz: number }>({ dx: 0, dz: 0 });
  const [ragdollActions, setRagdollActions] = useState({
    jumpTrigger: 0,
    flopTrigger: 0,
    leftGrab: false,
    rightGrab: false,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const profileRef = useRef(profile);
  profileRef.current = profile;

  // Save profile changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile));
    } catch {
      // ignore
    }
  }, [profile]);

  // Keep URL query param `?room=` synced so sharing the browser URL always invites friends to the exact room
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('room') !== roomId) {
      url.searchParams.set('room', roomId);
      window.history.replaceState({}, '', url.toString());
    }
  }, [roomId]);

  const sendWsMessage = useCallback((payload: unknown) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  }, []);

  // Connect & Auto-Reconnect WebSocket
  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let isUnmounted = false;

    const connect = () => {
      if (isUnmounted) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        const p = profileRef.current;
        ws.send(
          JSON.stringify({
            type: 'room:join',
            roomId,
            playerId: p.playerId,
            name: p.name,
            balance: p.balance,
            totalWon: p.totalWon,
            lastDailyReward: p.lastDailyReward,
            customization: p.customization,
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case 'room:init': {
              setPlayers(data.players || []);
              setChatMessages(data.chatHistory || []);
              if (data.crash) setCrashState(data.crash);
              if (data.roulette) setRouletteState(data.roulette);
              if (data.roomsList) setRoomsList(data.roomsList);
              break;
            }

            case 'rooms:list': {
              setRoomsList(data.rooms || []);
              break;
            }

            case 'player:joined': {
              const newPlayer: PlayerState = data.player;
              setPlayers((prev) => {
                if (prev.some((x) => x.id === newPlayer.id)) {
                  return prev.map((x) => (x.id === newPlayer.id ? newPlayer : x));
                }
                return [...prev, newPlayer];
              });
              break;
            }

            case 'player:moved': {
              setPlayers((prev) =>
                prev.map((p) =>
                  p.id === data.playerId
                    ? {
                        ...p,
                        x: data.x,
                        y: data.y,
                        z: data.z,
                        vx: data.vx,
                        vz: data.vz,
                        rotationY: data.rotationY,
                        armSwingPhase: data.armSwingPhase,
                        leftArmGrab: data.leftArmGrab,
                        rightArmGrab: data.rightArmGrab,
                        isJumping: data.isJumping,
                        isRagdollFlop: data.isRagdollFlop,
                      }
                    : p
                )
              );
              break;
            }

            case 'player:updated': {
              const updated: PlayerState = data.player;
              setPlayers((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
              if (updated.id === profileRef.current.playerId) {
                setProfile((prev) => ({
                  ...prev,
                  balance: updated.balance,
                  totalWon: updated.totalWon,
                  lastDailyReward: updated.lastDailyReward ?? prev.lastDailyReward,
                }));
              }
              break;
            }

            case 'player:left': {
              setPlayers((prev) => prev.filter((p) => p.id !== data.playerId));
              break;
            }

            case 'chat:message': {
              const msg: ChatMessage = data.message;
              setChatMessages((prev) => {
                if (prev.some((m) => m.id === msg.id)) return prev;
                return [...prev.slice(-59), msg];
              });
              break;
            }

            case 'crash:state': {
              setCrashState(data.crash);
              break;
            }

            case 'roulette:state': {
              setRouletteState(data.roulette);
              break;
            }
          }
        } catch (err) {
          console.error('WS parse error:', err);
        }
      };

      ws.onclose = () => {
        if (!isUnmounted) {
          reconnectTimer = setTimeout(connect, 2000);
        }
      };
    };

    connect();

    return () => {
      isUnmounted = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [roomId]);

  const handleSelectStation = (stationId: GameStationId | null) => {
    setActiveStation(stationId);
    sendWsMessage({ type: 'player:station', stationId });
  };

  const handleWalletTransaction = (delta: number, gameName?: string, isRefund?: boolean) => {
    setProfile((prev) => {
      const nextBal = Math.max(0, Math.round((prev.balance + delta) * 100) / 100);
      const nextWon =
        delta > 0 && !isRefund ? Math.round((prev.totalWon + delta) * 100) / 100 : prev.totalWon;
      return { ...prev, balance: nextBal, totalWon: nextWon };
    });
    sendWsMessage({ type: 'wallet:transaction', delta, gameName, isRefund });
  };

  const handleClaimReward = (amount: number, isDaily: boolean) => {
    const now = Date.now();
    setProfile((prev) => ({
      ...prev,
      balance: Math.round((prev.balance + amount) * 100) / 100,
      lastDailyReward: isDaily ? now : prev.lastDailyReward,
    }));
    sendWsMessage({
      type: 'wallet:transaction',
      delta: amount,
      gameName: isDaily ? 'Roue Quotidienne' : 'Ravitaillement VIP',
      isRefund: !isDaily,
      lastDailyReward: isDaily ? now : undefined,
    });
  };

  const handleSaveCustomization = (newName: string, newCust: CharacterCustomization) => {
    setProfile((prev) => ({ ...prev, name: newName, customization: newCust }));
    sendWsMessage({
      type: 'player:customize',
      name: newName,
      customization: newCust,
    });
  };

  const handleJoinRoom = (targetRoomId: string, customRoomName?: string) => {
    setRoomId(targetRoomId);
    sendWsMessage({
      type: 'room:join',
      roomId: targetRoomId,
      customRoomName,
      playerId: profile.playerId,
      name: profile.name,
      balance: profile.balance,
      totalWon: profile.totalWon,
      lastDailyReward: profile.lastDailyReward,
      customization: profile.customization,
    });
  };

  const handleShareInviteQuick = () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(
      roomId
    )}`;
    navigator.clipboard.writeText(shareUrl);
    soundFX.playChipClick();
    setCopiedBanner(true);
    setTimeout(() => setCopiedBanner(false), 2500);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col bg-[#0B0F17] text-[#F8FAFC]">
      {/* Strict 3-Zone Top Navigation Bar Contract */}
      <header className="relative z-30 flex items-center justify-between gap-8 px-6 py-3.5 bg-[#0B0F17]/90 backdrop-blur-md border-b border-white/10">
        {/* Zone 1: Single text element wordmark */}
        <a
          href={`?room=${encodeURIComponent(roomId)}`}
          onClick={(e) => {
            e.preventDefault();
            handleSelectStation(null);
          }}
          className="text-lg font-display font-bold tracking-tight text-[#D4AF37] whitespace-nowrap shrink-0"
        >
          Monte-Carlo Ragdoll 3D
        </a>

        {/* Zone 2: 5 concise single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
          <button
            type="button"
            onClick={() => setActiveSideTab(activeSideTab === 'games' ? null : 'games')}
            className="hover:text-[#D4AF37] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Tables & Jeux ({profile.balance.toLocaleString('fr-FR')} €)
          </button>
          <button
            type="button"
            onClick={() => setShowCustomizer(true)}
            className="hover:text-[#D4AF37] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Personnage
          </button>
          <button
            type="button"
            onClick={() => setShowRoomsModal(true)}
            className="hover:text-[#D4AF37] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Salons (#{roomId})
          </button>
          <button
            type="button"
            onClick={() =>
              setActiveSideTab(activeSideTab === 'leaderboard' ? null : 'leaderboard')
            }
            className="hover:text-[#D4AF37] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Classement
          </button>
          <button
            type="button"
            onClick={() => setShowDailyModal(true)}
            className="hover:text-[#D4AF37] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Bonus Quotidien
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleShareInviteQuick}
            className="px-4 py-2 text-xs font-bold text-[#0B0F17] bg-[#D4AF37] rounded-lg hover:bg-[#E5C158] transition-colors whitespace-nowrap shrink-0 shadow-md"
          >
            {copiedBanner ? 'Lien Copié !' : 'Inviter des Amis'}
          </button>
        </div>
      </header>

      {/* Sub-header Mobile Bar & Live Balance / Status Strip */}
      <div className="relative z-20 flex items-center justify-between gap-3 px-4 py-2 bg-[#111827]/85 backdrop-blur-sm border-b border-white/5 text-xs">
        <div className="flex items-center gap-3 overflow-x-auto">
          <span className="font-mono-num font-bold text-[#D4AF37] whitespace-nowrap">
            Solde : {profile.balance.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
          </span>
          <span className="text-slate-500">·</span>
          <span className="text-slate-300 whitespace-nowrap">
            Salon : <strong className="text-white">#{roomId}</strong> ({players.length} en ligne)
          </span>
        </div>

        <div className="flex md:hidden items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveSideTab(activeSideTab ? null : 'games')}
            className="px-2.5 py-1 rounded bg-slate-800 text-slate-200 font-medium whitespace-nowrap"
          >
            Jeux & Chat
          </button>
          <button
            type="button"
            onClick={() => setShowCustomizer(true)}
            className="px-2.5 py-1 rounded bg-slate-800 text-slate-200 font-medium whitespace-nowrap"
          >
            Bonhomme
          </button>
          <button
            type="button"
            onClick={() => setShowDailyModal(true)}
            className="px-2.5 py-1 rounded bg-[#D4AF37]/20 text-[#D4AF37] font-semibold whitespace-nowrap"
          >
            +€ Bonus
          </button>
        </div>
      </div>

      {/* Main 3D Interactive Casino World with Ragdoll Physics */}
      <main className="relative flex-1 w-full h-full overflow-hidden">
        <CasinoWorld3D
          myPlayerId={profile.playerId}
          myName={profile.name}
          myCustomization={profile.customization}
          players={players}
          activeStation={activeStation}
          onSelectStation={(id) => handleSelectStation(id)}
          onNearStationChange={setNearStation}
          onSendMove={(movePayload) =>
            sendWsMessage({
              type: 'player:move',
              ...movePayload,
            })
          }
          externalJoystick={joystick}
          externalActions={ragdollActions}
        />

        {/* Floating Chat, Leaderboard, Game Directory & Touch Controls */}
        <CasinoFloatingHUD
          myPlayerId={profile.playerId}
          players={players}
          chatMessages={chatMessages}
          nearStation={nearStation}
          activeTab={activeSideTab}
          setActiveTab={setActiveSideTab}
          onSendChat={(text) => sendWsMessage({ type: 'chat:send', text })}
          onSendEmote={(emote) => sendWsMessage({ type: 'player:emote', emote })}
          onSelectStation={(id) => handleSelectStation(id)}
          onJoystickChange={(dx, dz) => setJoystick({ dx, dz })}
          onTriggerJump={() =>
            setRagdollActions((prev) => ({ ...prev, jumpTrigger: prev.jumpTrigger + 1 }))
          }
          onTriggerFlop={() =>
            setRagdollActions((prev) => ({ ...prev, flopTrigger: prev.flopTrigger + 1 }))
          }
          onToggleGrab={(left, right) =>
            setRagdollActions((prev) => ({ ...prev, leftGrab: left, rightGrab: right }))
          }
        />
      </main>

      {/* Active Casino Game Modal (9 Complete Games) */}
      {activeStation && (
        <CasinoGameModal
          stationId={activeStation}
          balance={profile.balance}
          myPlayerId={profile.playerId}
          crashState={crashState}
          rouletteState={rouletteState}
          onClose={() => handleSelectStation(null)}
          onSwitchStation={(id) => handleSelectStation(id)}
          onWalletTransaction={handleWalletTransaction}
          onCrashBet={(amount) => sendWsMessage({ type: 'crash:bet', amount })}
          onCrashCashout={() => sendWsMessage({ type: 'crash:cashout' })}
          onRouletteBet={(bet: RouletteBet) => sendWsMessage({ type: 'roulette:bet', bet })}
          onRouletteClear={() => sendWsMessage({ type: 'roulette:clear' })}
        />
      )}

      {/* Ragdoll Customizer Modal */}
      {showCustomizer && (
        <RagdollCustomizerModal
          name={profile.name}
          customization={profile.customization}
          onSave={handleSaveCustomization}
          onClose={() => setShowCustomizer(false)}
        />
      )}

      {/* Multiplayer Rooms & Invite Link Modal */}
      {showRoomsModal && (
        <RoomsManagerModal
          currentRoomId={roomId}
          rooms={roomsList}
          onJoinRoom={handleJoinRoom}
          onClose={() => setShowRoomsModal(false)}
        />
      )}

      {/* Daily Reward Wheel & Free Virtual Euro Refill Modal */}
      {showDailyModal && (
        <DailyRewardModal
          lastDailyReward={profile.lastDailyReward}
          balance={profile.balance}
          onClaimReward={handleClaimReward}
          onClose={() => setShowDailyModal(false)}
        />
      )}
    </div>
  );
}
