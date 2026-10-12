import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import {
  PlayerState,
  ChatMessage,
  RoomInfo,
  CrashGameState,
  RouletteGameState,
  RouletteBet,
  CharacterCustomization,
  GameStationId,
  ShopItemId,
  WorldItemEvent,
  TableVisualEvent,
} from './src/types/casino.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

interface ServerRoom {
  id: string;
  name: string;
  isCustom: boolean;
  createdAt: number;
  players: Map<string, PlayerState>;
  chatHistory: ChatMessage[];
  crash: CrashGameState & { targetCrashPoint: number };
  roulette: RouletteGameState;
  latestTableEvents: Record<string, TableVisualEvent>;
}

const rooms = new Map<string, ServerRoom>();
const clientSocketMap = new Map<WebSocket, { playerId: string; roomId: string }>();

const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

function generateCrashPoint(): number {
  const r = Math.random();
  if (r < 0.04) return 1.0;
  const raw = 0.99 / (1 - Math.random());
  return Math.max(1.01, Math.min(1000, Math.floor(raw * 100) / 100));
}

function getOrCreateRoom(roomId: string, customName?: string): ServerRoom {
  const cleanId = roomId.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '') || 'grand-salon';
  let room = rooms.get(cleanId);
  if (!room) {
    const defaultNames: Record<string, string> = {
      'grand-salon': 'Grand Palais Monte-Carlo 3D',
      'vip-riviera': 'Salon VIP Riviera & Bowling',
      'high-rollers': 'Arène des Flambeurs',
    };
    room = {
      id: cleanId,
      name: customName || defaultNames[cleanId] || `Salon #${cleanId.toUpperCase()}`,
      isCustom: !defaultNames[cleanId],
      createdAt: Date.now(),
      players: new Map(),
      chatHistory: [
        {
          id: `sys-${Date.now()}`,
          senderId: 'system',
          senderName: 'Concierge Royal',
          senderColor: '#D4AF37',
          text: `Bienvenue dans ${
            customName || defaultNames[cleanId] || `le salon #${cleanId.toUpperCase()}`
          } ! Approchez-vous d'une table, du Bowling ou du Laser Game et appuyez sur [F] pour jouer en 3D avec vos amis !`,
          timestamp: Date.now(),
          isSystem: true,
        },
      ],
      crash: {
        phase: 'BETTING',
        multiplier: 1.0,
        countdown: 6,
        history: [1.42, 2.85, 1.12, 6.4, 1.95, 14.2],
        bets: {},
        targetCrashPoint: generateCrashPoint(),
      },
      roulette: {
        phase: 'BETTING',
        countdown: 12,
        winningNumber: null,
        history: [17, 0, 32, 8, 23, 14, 5],
        playerBets: {},
      },
      latestTableEvents: {},
    };
    rooms.set(cleanId, room);
  }
  return room;
}

getOrCreateRoom('grand-salon', 'Grand Palais Monte-Carlo 3D');
getOrCreateRoom('vip-riviera', 'Salon VIP Riviera & Bowling');

function broadcastToRoom(roomId: string, payload: unknown, excludeSocket?: WebSocket) {
  const message = JSON.stringify(payload);
  for (const [ws, meta] of clientSocketMap.entries()) {
    if (meta.roomId === roomId && ws !== excludeSocket && ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  }
}

function broadcastRoomsList() {
  const list: RoomInfo[] = Array.from(rooms.values()).map((r) => ({
    id: r.id,
    name: r.name,
    playerCount: r.players.size,
    isCustom: r.isCustom,
    createdAt: r.createdAt,
  }));
  const msg = JSON.stringify({ type: 'rooms:list', rooms: list });
  for (const [ws] of clientSocketMap.entries()) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(msg);
    }
  }
}

function addRoomChatMessage(room: ServerRoom, msg: ChatMessage) {
  room.chatHistory.push(msg);
  if (room.chatHistory.length > 60) {
    room.chatHistory.shift();
  }
  broadcastToRoom(room.id, { type: 'chat:message', message: msg });
}

function evaluateRouletteBet(bet: RouletteBet, winningNum: number): number {
  if (bet.type === 'number') {
    return Number(bet.value) === winningNum ? bet.amount * 36 : 0;
  }
  if (winningNum === 0) {
    return bet.type === 'color' && bet.value === 'green' ? bet.amount * 36 : 0;
  }
  const isRed = RED_NUMBERS.has(winningNum);
  if (bet.type === 'color') {
    if (bet.value === 'red' && isRed) return bet.amount * 2;
    if (bet.value === 'black' && !isRed) return bet.amount * 2;
    return 0;
  }
  if (bet.type === 'parity') {
    const isEven = winningNum % 2 === 0;
    if (bet.value === 'even' && isEven) return bet.amount * 2;
    if (bet.value === 'odd' && !isEven) return bet.amount * 2;
    return 0;
  }
  if (bet.type === 'dozen') {
    if (bet.value === '1st12' && winningNum >= 1 && winningNum <= 12) return bet.amount * 3;
    if (bet.value === '2nd12' && winningNum >= 13 && winningNum <= 24) return bet.amount * 3;
    if (bet.value === '3rd12' && winningNum >= 25 && winningNum <= 36) return bet.amount * 3;
    return 0;
  }
  return 0;
}

let lastSecondTick = Date.now();
setInterval(() => {
  const now = Date.now();
  const isSecondTick = now - lastSecondTick >= 1000;
  if (isSecondTick) lastSecondTick = now;

  for (const room of rooms.values()) {
    if (room.players.size === 0) continue;

    // --- CRASH GAME LOOP ---
    const c = room.crash;
    if (c.phase === 'BETTING') {
      if (isSecondTick) {
        c.countdown = Math.max(0, c.countdown - 1);
        if (c.countdown === 0) {
          c.phase = 'FLYING';
          c.multiplier = 1.0;
          c.targetCrashPoint = generateCrashPoint();
        }
        broadcastToRoom(room.id, {
          type: 'crash:state',
          crash: {
            phase: c.phase,
            multiplier: c.multiplier,
            countdown: c.countdown,
            history: c.history,
            bets: c.bets,
          },
        });
      }
    } else if (c.phase === 'FLYING') {
      const step = Math.max(0.01, c.multiplier * 0.018);
      c.multiplier = Math.round((c.multiplier + step) * 100) / 100;
      if (c.multiplier >= c.targetCrashPoint) {
        c.multiplier = c.targetCrashPoint;
        c.phase = 'CRASHED';
        c.countdown = 4;
        c.history = [c.multiplier, ...c.history.slice(0, 9)];
      }
      broadcastToRoom(room.id, {
        type: 'crash:state',
        crash: {
          phase: c.phase,
          multiplier: c.multiplier,
          countdown: c.countdown,
          history: c.history,
          bets: c.bets,
        },
      });
    } else if (c.phase === 'CRASHED') {
      if (isSecondTick) {
        c.countdown = Math.max(0, c.countdown - 1);
        if (c.countdown === 0) {
          c.phase = 'BETTING';
          c.countdown = 6;
          c.multiplier = 1.0;
          c.bets = {};
        }
        broadcastToRoom(room.id, {
          type: 'crash:state',
          crash: {
            phase: c.phase,
            multiplier: c.multiplier,
            countdown: c.countdown,
            history: c.history,
            bets: c.bets,
          },
        });
      }
    }

    // --- ROULETTE GAME LOOP ---
    if (isSecondTick) {
      const r = room.roulette;
      r.countdown = Math.max(0, r.countdown - 1);

      if (r.phase === 'BETTING' && r.countdown === 0) {
        r.phase = 'SPINNING';
        r.countdown = 5;
        r.winningNumber = Math.floor(Math.random() * 37);
      } else if (r.phase === 'SPINNING' && r.countdown === 0) {
        r.phase = 'RESULT';
        r.countdown = 5;
        const winNum = r.winningNumber ?? 0;
        r.history = [winNum, ...r.history.slice(0, 11)];

        for (const [pid, entry] of Object.entries(r.playerBets)) {
          let payout = 0;
          for (const bet of entry.bets) {
            payout += evaluateRouletteBet(bet, winNum);
          }
          entry.lastWin = payout;
          if (payout > 0) {
            const p = room.players.get(pid);
            if (p) {
              p.balance = Math.round((p.balance + payout) * 100) / 100;
              p.totalWon = Math.round((p.totalWon + (payout - entry.totalBet)) * 100) / 100;
              broadcastToRoom(room.id, { type: 'player:updated', player: p });
              if (payout >= 100) {
                addRoomChatMessage(room, {
                  id: `win-${Date.now()}-${Math.random()}`,
                  senderId: 'system',
                  senderName: 'Roulette Royale 3D',
                  senderColor: '#D4AF37',
                  text: `${p.name} remporte ${payout.toLocaleString('fr-FR')} € sur le numéro ${winNum} !`,
                  timestamp: Date.now(),
                  isSystem: true,
                  gameWinAmount: payout,
                  gameName: 'Roulette Royale 3D',
                });
              }
            }
          }
        }
      } else if (r.phase === 'RESULT' && r.countdown === 0) {
        r.phase = 'BETTING';
        r.countdown = 12;
        r.winningNumber = null;
        r.playerBets = {};
      }

      broadcastToRoom(room.id, {
        type: 'roulette:state',
        roulette: r,
      });
    }
  }
}, 100);

async function startServer() {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', roomsCount: rooms.size });
  });

  app.get('/api/rooms', (_req, res) => {
    const list: RoomInfo[] = Array.from(rooms.values()).map((r) => ({
      id: r.id,
      name: r.name,
      playerCount: r.players.size,
      isCustom: r.isCustom,
      createdAt: r.createdAt,
    }));
    res.json({ rooms: list });
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws: WebSocket) => {
    ws.on('message', (raw: string) => {
      try {
        const data = JSON.parse(raw.toString());

        if (data.type === 'room:join') {
          const prevMeta = clientSocketMap.get(ws);
          if (prevMeta) {
            const oldRoom = rooms.get(prevMeta.roomId);
            if (oldRoom) {
              oldRoom.players.delete(prevMeta.playerId);
              broadcastToRoom(oldRoom.id, { type: 'player:left', playerId: prevMeta.playerId });
            }
          }

          const roomId = data.roomId || 'grand-salon';
          const room = getOrCreateRoom(roomId, data.customRoomName);
          const playerId = data.playerId || `p-${Math.random().toString(36).substring(2, 9)}`;

          const existingPlayer = room.players.get(playerId);
          const spawnAngle = Math.random() * Math.PI * 2;
          const spawnRadius = 2.5 + Math.random() * 2.5;

          const player: PlayerState = {
            id: playerId,
            name: (data.name || 'Joueur VIP').slice(0, 22),
            roomId: room.id,
            balance:
              typeof data.balance === 'number' ? data.balance : existingPlayer?.balance ?? 2500,
            totalWon:
              typeof data.totalWon === 'number' ? data.totalWon : existingPlayer?.totalWon ?? 0,
            x: Math.cos(spawnAngle) * spawnRadius,
            y: 0,
            z: Math.sin(spawnAngle) * spawnRadius + 2,
            vx: 0,
            vz: 0,
            rotationY: 0,
            armSwingPhase: 0,
            leftArmGrab: false,
            rightArmGrab: false,
            isJumping: false,
            isRagdollFlop: false,
            customization: data.customization || {
              bodyColor: '#FDBA74',
              outfitColor: '#3B82F6',
              hat: 'tophat',
              accessory: 'sunglasses',
              aura: 'none',
            },
            activeStation: null,
            seatIndex: 0,
            equippedItem: data.equippedItem || null,
            ownedItems: Array.isArray(data.ownedItems) ? data.ownedItems : ['cigarette'],
            laserScore: existingPlayer?.laserScore ?? 0,
            lastDailyReward: data.lastDailyReward || null,
          };

          room.players.set(playerId, player);
          clientSocketMap.set(ws, { playerId, roomId: room.id });

          ws.send(
            JSON.stringify({
              type: 'room:init',
              playerId,
              room: {
                id: room.id,
                name: room.name,
                isCustom: room.isCustom,
                createdAt: room.createdAt,
              },
              players: Array.from(room.players.values()),
              chatHistory: room.chatHistory,
              crash: {
                phase: room.crash.phase,
                multiplier: room.crash.multiplier,
                countdown: room.crash.countdown,
                history: room.crash.history,
                bets: room.crash.bets,
              },
              roulette: room.roulette,
              latestTableEvents: room.latestTableEvents,
              roomsList: Array.from(rooms.values()).map((r) => ({
                id: r.id,
                name: r.name,
                playerCount: r.players.size,
                isCustom: r.isCustom,
                createdAt: r.createdAt,
              })),
            })
          );

          broadcastToRoom(room.id, { type: 'player:joined', player }, ws);
          broadcastRoomsList();
          return;
        }

        const meta = clientSocketMap.get(ws);
        if (!meta) return;
        const room = rooms.get(meta.roomId);
        if (!room) return;
        const player = room.players.get(meta.playerId);
        if (!player) return;

        switch (data.type) {
          case 'player:move': {
            player.x = data.x;
            player.y = data.y;
            player.z = data.z;
            player.vx = data.vx || 0;
            player.vz = data.vz || 0;
            player.rotationY = data.rotationY;
            player.armSwingPhase = data.armSwingPhase || 0;
            player.leftArmGrab = !!data.leftArmGrab;
            player.rightArmGrab = !!data.rightArmGrab;
            player.isJumping = !!data.isJumping;
            player.isRagdollFlop = !!data.isRagdollFlop;
            broadcastToRoom(
              room.id,
              {
                type: 'player:moved',
                playerId: player.id,
                x: player.x,
                y: player.y,
                z: player.z,
                vx: player.vx,
                vz: player.vz,
                rotationY: player.rotationY,
                armSwingPhase: player.armSwingPhase,
                leftArmGrab: player.leftArmGrab,
                rightArmGrab: player.rightArmGrab,
                isJumping: player.isJumping,
                isRagdollFlop: player.isRagdollFlop,
              },
              ws
            );
            break;
          }

          case 'player:customize': {
            if (data.name) player.name = String(data.name).slice(0, 22);
            if (data.customization) {
              player.customization = data.customization as CharacterCustomization;
            }
            broadcastToRoom(room.id, { type: 'player:updated', player });
            break;
          }

          case 'player:station': {
            const stationId = (data.stationId as GameStationId) || null;
            player.activeStation = stationId;
            if (stationId) {
              // Assign an available seat around this 3D table (0..5)
              const usedSeats = new Set<number>();
              for (const other of room.players.values()) {
                if (other.id !== player.id && other.activeStation === stationId) {
                  usedSeats.add(other.seatIndex);
                }
              }
              let assigned = 0;
              while (usedSeats.has(assigned) && assigned < 6) assigned++;
              player.seatIndex = assigned;
            }
            broadcastToRoom(room.id, { type: 'player:updated', player });
            break;
          }

          case 'player:equip': {
            player.equippedItem = (data.itemId as ShopItemId) || null;
            if (Array.isArray(data.ownedItems)) {
              player.ownedItems = data.ownedItems;
            }
            broadcastToRoom(room.id, { type: 'player:updated', player });
            break;
          }

          case 'item:use': {
            const itemEvent: WorldItemEvent = {
              id: `itm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              playerId: player.id,
              playerName: player.name,
              itemId: data.itemId as ShopItemId,
              x: Number(data.x ?? player.x),
              y: Number(data.y ?? player.y),
              z: Number(data.z ?? player.z),
              rotationY: Number(data.rotationY ?? player.rotationY),
              targetPlayerId: data.targetPlayerId,
              timestamp: Date.now(),
            };
            broadcastToRoom(room.id, { type: 'item:triggered', event: itemEvent });
            break;
          }

          case 'table:action': {
            const tvEvent: TableVisualEvent = {
              id: `tv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              stationId: data.stationId as GameStationId,
              playerId: player.id,
              playerName: player.name,
              summary: String(data.summary || ''),
              winAmount: Number(data.winAmount || 0),
              visualData: data.visualData,
              timestamp: Date.now(),
            };
            room.latestTableEvents[tvEvent.stationId] = tvEvent;
            broadcastToRoom(room.id, { type: 'table:event', event: tvEvent });
            break;
          }

          case 'player:emote': {
            player.emote = String(data.emote || '').slice(0, 28);
            player.emoteExpiresAt = Date.now() + 4000;
            broadcastToRoom(room.id, { type: 'player:updated', player });
            break;
          }

          case 'chat:send': {
            const text = String(data.text || '').trim().slice(0, 240);
            if (!text) break;
            const msg: ChatMessage = {
              id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              senderId: player.id,
              senderName: player.name,
              senderColor: player.customization.outfitColor || '#D4AF37',
              text,
              timestamp: Date.now(),
            };
            addRoomChatMessage(room, msg);
            break;
          }

          case 'wallet:transaction': {
            const delta = Number(data.delta) || 0;
            const newBalance = Math.max(0, Math.round((player.balance + delta) * 100) / 100);
            player.balance = newBalance;
            if (delta > 0 && !data.isRefund) {
              player.totalWon = Math.round((player.totalWon + delta) * 100) / 100;
            }
            if (data.lastDailyReward) {
              player.lastDailyReward = data.lastDailyReward;
            }
            if (data.addLaserScore) {
              player.laserScore = (player.laserScore || 0) + Number(data.addLaserScore);
            }
            broadcastToRoom(room.id, { type: 'player:updated', player });

            if (delta >= 150 && data.gameName) {
              addRoomChatMessage(room, {
                id: `win-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                senderId: 'system',
                senderName: data.gameName,
                senderColor: '#10B981',
                text: `Jackpot 3D ! ${player.name} vient de gagner +${delta.toLocaleString('fr-FR')} € à ${data.gameName} !`,
                timestamp: Date.now(),
                isSystem: true,
                gameWinAmount: delta,
                gameName: data.gameName,
              });
            }
            break;
          }

          case 'crash:bet': {
            const amount = Math.floor(Number(data.amount) || 0);
            if (room.crash.phase !== 'BETTING' || amount <= 0 || player.balance < amount) break;
            if (room.crash.bets[player.id]) break;

            player.balance = Math.round((player.balance - amount) * 100) / 100;
            room.crash.bets[player.id] = {
              playerName: player.name,
              amount,
              cashedOut: false,
            };
            broadcastToRoom(room.id, { type: 'player:updated', player });
            broadcastToRoom(room.id, {
              type: 'crash:state',
              crash: {
                phase: room.crash.phase,
                multiplier: room.crash.multiplier,
                countdown: room.crash.countdown,
                history: room.crash.history,
                bets: room.crash.bets,
              },
            });
            break;
          }

          case 'crash:cashout': {
            const bet = room.crash.bets[player.id];
            if (room.crash.phase !== 'FLYING' || !bet || bet.cashedOut) break;

            bet.cashedOut = true;
            bet.cashoutMultiplier = room.crash.multiplier;
            const payout = Math.round(bet.amount * room.crash.multiplier * 100) / 100;
            bet.profit = Math.round((payout - bet.amount) * 100) / 100;

            player.balance = Math.round((player.balance + payout) * 100) / 100;
            player.totalWon = Math.round((player.totalWon + bet.profit) * 100) / 100;

            broadcastToRoom(room.id, { type: 'player:updated', player });
            broadcastToRoom(room.id, {
              type: 'crash:state',
              crash: {
                phase: room.crash.phase,
                multiplier: room.crash.multiplier,
                countdown: room.crash.countdown,
                history: room.crash.history,
                bets: room.crash.bets,
              },
            });

            if (payout >= 150) {
              addRoomChatMessage(room, {
                id: `crash-${Date.now()}-${Math.random()}`,
                senderId: 'system',
                senderName: 'Astronaut Crash 3D',
                senderColor: '#F59E0B',
                text: `${player.name} s'est éjecté à ${room.crash.multiplier.toFixed(2)}x et encaisse ${payout.toLocaleString('fr-FR')} € !`,
                timestamp: Date.now(),
                isSystem: true,
                gameWinAmount: payout,
                gameName: 'Astronaut Crash 3D',
              });
            }
            break;
          }

          case 'roulette:bet': {
            if (room.roulette.phase !== 'BETTING') break;
            const bet: RouletteBet = data.bet;
            if (!bet || bet.amount <= 0 || player.balance < bet.amount) break;

            player.balance = Math.round((player.balance - bet.amount) * 100) / 100;
            if (!room.roulette.playerBets[player.id]) {
              room.roulette.playerBets[player.id] = {
                playerName: player.name,
                bets: [],
                totalBet: 0,
              };
            }
            room.roulette.playerBets[player.id].bets.push(bet);
            room.roulette.playerBets[player.id].totalBet += bet.amount;

            broadcastToRoom(room.id, { type: 'player:updated', player });
            broadcastToRoom(room.id, { type: 'roulette:state', roulette: room.roulette });
            break;
          }

          case 'roulette:clear': {
            if (room.roulette.phase !== 'BETTING') break;
            const entry = room.roulette.playerBets[player.id];
            if (entry && entry.totalBet > 0) {
              player.balance = Math.round((player.balance + entry.totalBet) * 100) / 100;
              delete room.roulette.playerBets[player.id];
              broadcastToRoom(room.id, { type: 'player:updated', player });
              broadcastToRoom(room.id, { type: 'roulette:state', roulette: room.roulette });
            }
            break;
          }
        }
      } catch (err) {
        console.error('WebSocket message error:', err);
      }
    });

    ws.on('close', () => {
      const meta = clientSocketMap.get(ws);
      if (meta) {
        const room = rooms.get(meta.roomId);
        if (room) {
          room.players.delete(meta.playerId);
          broadcastToRoom(room.id, { type: 'player:left', playerId: meta.playerId });
        }
        clientSocketMap.delete(ws);
        broadcastRoomsList();
      }
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Monte-Carlo Ragdoll 3D Casino Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
