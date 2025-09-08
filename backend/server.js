const express = require('express');
const cors = require('cors');
const evaluatePrompts = require('./llm').evaluatePrompts;
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Game state - single game only
let gameState = {
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
  gamePhase: 'waiting', // 'waiting', 'emoji_selection', 'prompt_phase', 'evaluation', 'game_over'
  timer: null,
  timerStartTime: null,
  roundNumber: 0,
  winner: null
};

// Reset game state
function resetGame() {
  gameState = {
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
    winner: null
  };
}

app.get('/api/health', (req, res) => {
  res.json({ message: 'Backend server is running!' });
});

// Player connection endpoints
app.post('/api/connect/:playerId', (req, res) => {
  const playerId = req.params.playerId;
  
  if (playerId !== '1' && playerId !== '2') {
    return res.status(400).json({ error: 'Invalid player ID' });
  }

  const playerKey = `player${playerId}`;
  gameState[playerKey].connected = true;

  // If both players connected and no emojis selected yet, move to emoji selection
  if (gameState.player1.connected && gameState.player2.connected && gameState.gamePhase === 'waiting') {
    gameState.gamePhase = 'emoji_selection';
  }

  res.json({ 
    success: true, 
    gameState: getPublicGameState(playerId)
  });
});

// Emoji selection endpoints
app.post('/api/select-emoji/:playerId', (req, res) => {
  const playerId = req.params.playerId;
  const { emoji } = req.body;

  if (playerId !== '1' && playerId !== '2') {
    return res.status(400).json({ error: 'Invalid player ID' });
  }

  if (!emoji) {
    return res.status(400).json({ error: 'Emoji required' });
  }

  const playerKey = `player${playerId}`;
  gameState[playerKey].emoji = emoji;

  // If both players have selected emojis, start first round
  if (gameState.player1.emoji && gameState.player2.emoji && gameState.gamePhase === 'emoji_selection') {
    startPromptPhase();
  }

  res.json({ 
    success: true, 
    gameState: getPublicGameState(playerId)
  });
});

// Prompt submission endpoint
app.post('/api/submit-prompt/:playerId', (req, res) => {
  const playerId = req.params.playerId;
  const { prompt } = req.body;

  if (playerId !== '1' && playerId !== '2') {
    return res.status(400).json({ error: 'Invalid player ID' });
  }

  if (gameState.gamePhase !== 'prompt_phase') {
    return res.status(400).json({ error: 'Not in prompt phase' });
  }

  const playerKey = `player${playerId}`;
  gameState[playerKey].prompt = prompt || '';
  gameState[playerKey].promptSubmitted = true;

  // If both players submitted prompts, evaluate immediately
  if (gameState.player1.promptSubmitted && gameState.player2.promptSubmitted) {
    evaluateRound();
  }

  res.json({ 
    success: true, 
    gameState: getPublicGameState(playerId)
  });
});

// Get game state endpoint
app.get('/api/game-state/:playerId', (req, res) => {
  const playerId = req.params.playerId;
  
  if (playerId !== '1' && playerId !== '2') {
    return res.status(400).json({ error: 'Invalid player ID' });
  }

  res.json({ gameState: getPublicGameState(playerId) });
});

// Reset game endpoint
app.post('/api/reset-game', (req, res) => {
  if (gameState.timer) {
    clearTimeout(gameState.timer);
  }
  resetGame();
  res.json({ success: true, gameState: getPublicGameState('1') });
});

// Start prompt phase with 1-minute timer
function startPromptPhase() {
  gameState.gamePhase = 'prompt_phase';
  gameState.roundNumber++;
  gameState.player1.prompt = '';
  gameState.player1.promptSubmitted = false;
  gameState.player2.prompt = '';
  gameState.player2.promptSubmitted = false;
  gameState.timerStartTime = Date.now();

  // Set 1-minute timer
  gameState.timer = setTimeout(() => {
    // Auto-submit empty prompts if time runs out
    if (!gameState.player1.promptSubmitted) {
      gameState.player1.prompt = '';
      gameState.player1.promptSubmitted = true;
    }
    if (!gameState.player2.promptSubmitted) {
      gameState.player2.prompt = '';
      gameState.player2.promptSubmitted = true;
    }
    evaluateRound();
  }, 60000); // 60 seconds
}

// Evaluate the round using LLM or default values
async function evaluateRound() {
  if (gameState.timer) {
    clearTimeout(gameState.timer);
    gameState.timer = null;
  }

  gameState.gamePhase = 'evaluation';
  gameState.timerStartTime = null;

  let result;
  try {
    if (evaluatePrompts) {
      result = await evaluatePrompts(
        gameState.player1.emoji,
        gameState.player1.prompt,
        gameState.player2.emoji,
        gameState.player2.prompt
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
    gameState.player1.health = Math.max(0, Math.min(100, gameState.player1.health - result.player2_damage));
    // Player 2 receives damage from Player 1
    gameState.player2.health = Math.max(0, Math.min(100, gameState.player2.health - result.player1_damage));

    // Check for winner
    if (gameState.player1.health <= 0 && gameState.player2.health <= 0) {
      gameState.winner = 'tie';
      gameState.gamePhase = 'game_over';
    } else if (gameState.player1.health <= 0) {
      gameState.winner = '2';
      gameState.gamePhase = 'game_over';
    } else if (gameState.player2.health <= 0) {
      gameState.winner = '1';
      gameState.gamePhase = 'game_over';
    } else {
      // Continue to next round after a brief delay
      setTimeout(() => {
        startPromptPhase();
      }, 3000);
    }

  } catch (error) {
    console.error('Error evaluating round:', error);
    // Continue game with default values on error
    gameState.player1.health = Math.max(0, gameState.player1.health - 5 + 5);
    gameState.player2.health = Math.max(0, gameState.player2.health - 5 + 5);
    
    setTimeout(() => {
      startPromptPhase();
    }, 3000);
  }
}

// Get public game state (hides opponent prompts during prompt phase)
function getPublicGameState(playerId) {
  const publicState = {
    player1: {
      connected: gameState.player1.connected,
      emoji: gameState.player1.emoji,
      health: gameState.player1.health,
      promptSubmitted: gameState.player1.promptSubmitted
    },
    player2: {
      connected: gameState.player2.connected,
      emoji: gameState.player2.emoji,
      health: gameState.player2.health,
      promptSubmitted: gameState.player2.promptSubmitted
    },
    gamePhase: gameState.gamePhase,
    roundNumber: gameState.roundNumber,
    winner: gameState.winner,
    timeRemaining: null
  };

  // Add player's own prompt
  const playerKey = `player${playerId}`;
  publicState[playerKey].prompt = gameState[playerKey].prompt;

  // Add timer start time if in prompt phase
  if (gameState.gamePhase === 'prompt_phase' && gameState.timerStartTime) {
    publicState.timerStartTime = gameState.timerStartTime;
  }

  return publicState;
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});