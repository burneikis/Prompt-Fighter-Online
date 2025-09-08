const express = require('express');
const cors = require('cors');
const evaluatePrompts = require('./llm').evaluatePrompts;
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Multiple games storage
let games = new Map();

// Generate 6-character alphanumeric code
function generateGameCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Create new game state
function createNewGame() {
  return {
    player1: {
      connected: false,
      emoji: null,
      health: 100,
      prompt: '',
      promptSubmitted: false
    },
    player2: {
      connected: false,
      emoji: null,
      health: 100,
      prompt: '',
      promptSubmitted: false
    },
    gamePhase: 'waiting',
    timer: null,
    timerStartTime: null,
    roundNumber: 0,
    winner: null,
    createdAt: Date.now(),
    playAgainRequests: {
      player1: false,
      player2: false
    }
  };
}

// Cleanup old games (run every 5 minutes)
setInterval(() => {
  const now = Date.now();
  const GAME_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  
  for (const [gameCode, game] of games.entries()) {
    if (now - game.createdAt > GAME_TIMEOUT) {
      if (game.timer) {
        clearTimeout(game.timer);
      }
      games.delete(gameCode);
      console.log(`Cleaned up game ${gameCode}`);
    }
  }
}, 5 * 60 * 1000);

app.get('/api/health', (req, res) => {
  res.json({ message: 'Backend server is running!' });
});

// Create new game
app.post('/api/create-game', (req, res) => {
  let gameCode;
  do {
    gameCode = generateGameCode();
  } while (games.has(gameCode)); // Ensure unique code

  const newGame = createNewGame();
  games.set(gameCode, newGame);

  res.json({ 
    success: true, 
    gameCode
  });
});

// Join existing game
app.post('/api/join-game/:gameCode', (req, res) => {
  const gameCode = req.params.gameCode.toUpperCase();
  
  if (!games.has(gameCode)) {
    return res.status(404).json({ error: 'Game not found' });
  }

  const game = games.get(gameCode);
  
  // Check if game is full
  if (game.player1.connected && game.player2.connected) {
    return res.status(400).json({ error: 'Game is full' });
  }

  // Assign player slot
  let playerId;
  if (!game.player1.connected) {
    playerId = '1';
    game.player1.connected = true;
  } else {
    playerId = '2';
    game.player2.connected = true;
  }

  // Start emoji selection if both players connected
  if (game.player1.connected && game.player2.connected && game.gamePhase === 'waiting') {
    game.gamePhase = 'emoji_selection';
  }

  res.json({ 
    success: true, 
    playerId,
    gameState: getPublicGameState(playerId, gameCode)
  });
});

// Player connection endpoints
app.post('/api/connect/:gameCode/:playerId', (req, res) => {
  const { gameCode, playerId } = req.params;
  
  if (playerId !== '1' && playerId !== '2') {
    return res.status(400).json({ error: 'Invalid player ID' });
  }

  if (!games.has(gameCode.toUpperCase())) {
    return res.status(404).json({ error: 'Game not found' });
  }

  const game = games.get(gameCode.toUpperCase());
  const playerKey = `player${playerId}`;
  game[playerKey].connected = true;

  // If both players connected and no emojis selected yet, move to emoji selection
  if (game.player1.connected && game.player2.connected && game.gamePhase === 'waiting') {
    game.gamePhase = 'emoji_selection';
  }

  res.json({ 
    success: true, 
    gameState: getPublicGameState(playerId, gameCode.toUpperCase())
  });
});

// Emoji selection endpoints
app.post('/api/select-emoji/:gameCode/:playerId', (req, res) => {
  const { gameCode, playerId } = req.params;
  const { emoji } = req.body;

  if (playerId !== '1' && playerId !== '2') {
    return res.status(400).json({ error: 'Invalid player ID' });
  }

  if (!emoji) {
    return res.status(400).json({ error: 'Emoji required' });
  }

  if (!games.has(gameCode.toUpperCase())) {
    return res.status(404).json({ error: 'Game not found' });
  }

  const game = games.get(gameCode.toUpperCase());
  const playerKey = `player${playerId}`;
  game[playerKey].emoji = emoji;

  // If both players have selected emojis, start first round
  if (game.player1.emoji && game.player2.emoji && game.gamePhase === 'emoji_selection') {
    startPromptPhase(gameCode.toUpperCase());
  }

  res.json({ 
    success: true, 
    gameState: getPublicGameState(playerId, gameCode.toUpperCase())
  });
});

// Prompt submission endpoint
app.post('/api/submit-prompt/:gameCode/:playerId', (req, res) => {
  const { gameCode, playerId } = req.params;
  const { prompt } = req.body;

  if (playerId !== '1' && playerId !== '2') {
    return res.status(400).json({ error: 'Invalid player ID' });
  }

  if (!games.has(gameCode.toUpperCase())) {
    return res.status(404).json({ error: 'Game not found' });
  }

  const game = games.get(gameCode.toUpperCase());
  if (game.gamePhase !== 'prompt_phase') {
    return res.status(400).json({ error: 'Not in prompt phase' });
  }

  const playerKey = `player${playerId}`;
  game[playerKey].prompt = prompt || '';
  game[playerKey].promptSubmitted = true;

  // If both players submitted prompts, evaluate immediately
  if (game.player1.promptSubmitted && game.player2.promptSubmitted) {
    evaluateRound(gameCode.toUpperCase());
  }

  res.json({ 
    success: true, 
    gameState: getPublicGameState(playerId, gameCode.toUpperCase())
  });
});

// Get game state endpoint
app.get('/api/game-state/:gameCode/:playerId', (req, res) => {
  const { gameCode, playerId } = req.params;
  
  if (playerId !== '1' && playerId !== '2') {
    return res.status(400).json({ error: 'Invalid player ID' });
  }

  if (!games.has(gameCode.toUpperCase())) {
    return res.status(404).json({ error: 'Game not found' });
  }

  res.json({ gameState: getPublicGameState(playerId, gameCode.toUpperCase()) });
});


// Start prompt phase with 1-minute timer
function startPromptPhase(gameCode) {
  const game = games.get(gameCode);
  if (!game) return;

  game.gamePhase = 'prompt_phase';
  game.roundNumber++;
  game.player1.prompt = '';
  game.player1.promptSubmitted = false;
  game.player2.prompt = '';
  game.player2.promptSubmitted = false;
  game.timerStartTime = Date.now();

  // Set 1-minute timer
  game.timer = setTimeout(() => {
    // Auto-submit empty prompts if time runs out
    if (!game.player1.promptSubmitted) {
      game.player1.prompt = '';
      game.player1.promptSubmitted = true;
    }
    if (!game.player2.promptSubmitted) {
      game.player2.prompt = '';
      game.player2.promptSubmitted = true;
    }
    evaluateRound(gameCode);
  }, 60000); // 60 seconds
}

// Evaluate the round using LLM or default values
async function evaluateRound(gameCode) {
  const game = games.get(gameCode);
  if (!game) return;

  if (game.timer) {
    clearTimeout(game.timer);
    game.timer = null;
  }

  game.gamePhase = 'evaluation';
  game.timerStartTime = null;

  let result;
  try {
    if (evaluatePrompts) {
      result = await evaluatePrompts(
        game.player1.emoji,
        game.player1.prompt,
        game.player2.emoji,
        game.player2.prompt
      );
    } else {
      // Use default evaluation when LLM is not available
      result = {
        player1_damage: 30, // 30 damage
        player2_damage: 25, // 25 damage
      };
    }

    // Apply damage
    // Player 1 receives damage from Player 2
    game.player1.health = Math.max(0, Math.min(100, game.player1.health - result.player2_damage));
    // Player 2 receives damage from Player 1
    game.player2.health = Math.max(0, Math.min(100, game.player2.health - result.player1_damage));

    // Check for winner
    if (game.player1.health <= 0 && game.player2.health <= 0) {
      game.winner = 'tie';
      game.gamePhase = 'game_over';
    } else if (game.player1.health <= 0) {
      game.winner = '2';
      game.gamePhase = 'game_over';
    } else if (game.player2.health <= 0) {
      game.winner = '1';
      game.gamePhase = 'game_over';
    } else {
      // Continue to next round after a brief delay
      setTimeout(() => {
        startPromptPhase(gameCode);
      }, 3000);
    }

  } catch (error) {
    console.error('Error evaluating round:', error);
    // Continue game with default values on error
    game.player1.health = Math.max(0, game.player1.health - 5 + 5);
    game.player2.health = Math.max(0, game.player2.health - 5 + 5);
    
    setTimeout(() => {
      startPromptPhase(gameCode);
    }, 3000);
  }
}

// Get public game state (hides opponent prompts during prompt phase)
function getPublicGameState(playerId, gameCode) {
  const game = games.get(gameCode);
  if (!game) return null;

  const publicState = {
    player1: {
      connected: game.player1.connected,
      emoji: game.player1.emoji,
      health: game.player1.health,
      promptSubmitted: game.player1.promptSubmitted
    },
    player2: {
      connected: game.player2.connected,
      emoji: game.player2.emoji,
      health: game.player2.health,
      promptSubmitted: game.player2.promptSubmitted
    },
    gamePhase: game.gamePhase,
    roundNumber: game.roundNumber,
    winner: game.winner,
    timeRemaining: null,
    gameCode: gameCode,
    playAgainRequests: game.playAgainRequests
  };

  // Add player's own prompt
  const playerKey = `player${playerId}`;
  publicState[playerKey].prompt = game[playerKey].prompt;

  // Add timer start time if in prompt phase
  if (game.gamePhase === 'prompt_phase' && game.timerStartTime) {
    publicState.timerStartTime = game.timerStartTime;
  }

  return publicState;
}

// Play again endpoint
app.post('/api/play-again/:gameCode/:playerId', (req, res) => {
  const { gameCode, playerId } = req.params;
  
  if (playerId !== '1' && playerId !== '2') {
    return res.status(400).json({ error: 'Invalid player ID' });
  }

  if (!games.has(gameCode.toUpperCase())) {
    return res.status(404).json({ error: 'Game not found' });
  }

  const game = games.get(gameCode.toUpperCase());
  
  if (game.gamePhase !== 'game_over') {
    return res.status(400).json({ error: 'Game not over yet' });
  }

  const playerKey = `player${playerId}`;
  game.playAgainRequests[playerKey] = true;

  // If both players want to play again, restart the game
  if (game.playAgainRequests.player1 && game.playAgainRequests.player2) {
    // Reset game state while keeping player connections and emojis
    game.player1.health = 100;
    game.player1.prompt = '';
    game.player1.promptSubmitted = false;
    game.player2.health = 100;
    game.player2.prompt = '';
    game.player2.promptSubmitted = false;
    game.gamePhase = 'prompt_phase';
    game.timer = null;
    game.timerStartTime = null;
    game.roundNumber = 0;
    game.winner = null;
    game.playAgainRequests.player1 = false;
    game.playAgainRequests.player2 = false;
    
    // Start the first round
    startPromptPhase(gameCode.toUpperCase());
  }

  res.json({ 
    success: true, 
    gameState: getPublicGameState(playerId, gameCode.toUpperCase())
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});