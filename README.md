# Prompt Fighter

A web game where two players battle by prompting against each other. Each player chooses an emoji and writes prompts to attack the opponent's emoji. An LLM evaluates the prompts and returns damage values.

## Game Overview

Prompt Fighter is a competitive 1v1 web game where players battle using the power of language. Each player selects an emoji character and takes turns writing creative prompts that can either attack their opponent. An AI language model evaluates each prompt and determines damage values, creating an engaging blend of creativity and strategy.

### How to Play

1. **Character Selection**: Each player chooses an emoji to represent their fighter
2. **Battle Phase**: Players have 1 minute to craft a prompt that can:
   - Attack the opponent's emoji character
3. **AI Evaluation**: Both prompts are sent to an LLM which calculates damage dealt
4. **Victory Condition**: First player to reduce opponent's health from 100 to 0 wins

### Features

- **Real-time Multiplayer**: Two players can connect and battle simultaneously
- **AI-Powered Combat**: OpenAI's language models evaluate prompt creativity and effectiveness  
- **Minimalist Dark Theme**: Clean, focused interface that highlights the gameplay
- **Timer-Based Rounds**: 60-second rounds keep the pace engaging
- **Instant Results**: See damage calculated in real-time

## Project Architecture

### Tech Stack

- **Frontend**: React 19 with modern hooks and components
- **Backend**: Node.js with Express server
- **AI Integration**: OpenAI API for prompt evaluation

### Project Structure

```
prompt-fighter/
├── frontend/src/
│   ├── App.js                 # React Router setup with 3 main routes
│   ├── App.css                # Dark theme styling with gradients
│   └── components/
│       ├── LandingPage.js     # Player selection screen
│       ├── PlayerSetup.js     # Emoji selection and waiting room
│       └── GamePlay.js        # Main battle interface
└── backend/
    ├── server.js              # Express server with game state management
    └── llm.js                 # OpenAI integration for prompt evaluation
```

### Core Game Flow

The game follows a strict state machine pattern managed by the backend server (`backend/server.js:22-42`):

```
waiting → emoji_selection → prompt_phase → evaluation → [game_over | next_round]
```

#### 1. Player Connection (`backend/server.js:74-93`)
- Players connect via `/api/connect/:playerId` endpoint
- Server tracks connection state and advances to emoji selection when both players join
- Each player gets a dedicated route: `/player/1` or `/player/2`

#### 2. Emoji Selection (`frontend/src/components/PlayerSetup.js:125-153`)
- 16 emoji options available: `['⚔️', '🛡️', '🔥', '❄️', '⚡', '🌟', '💎', '🎯', '🏹', '🔮', '🗡️', '🛸', '🐉', '🦅', '🐺', '🦄']`
- Selection triggers `/api/select-emoji/:playerId` endpoint (`backend/server.js:96-120`)
- Game advances to prompt phase when both players have chosen

#### 3. Battle Phase (`frontend/src/components/GamePlay.js:196-232`)
- 60-second timer managed by `startPromptPhase()` (`backend/server.js:171-193`)
- Players write prompts in textarea with real-time character tracking
- Auto-submit occurs if timer expires (`frontend/src/components/GamePlay.js:89-95`)
- Status updates show opponent submission state

#### 4. Prompt Evaluation System

The LLM evaluation system (`backend/llm.js`) uses several sophisticated techniques:

**Anti-Bias Randomization (`backend/llm.js:53-70`)**:
```javascript
const shouldSwap = Math.random() < 0.5;
// Randomizes player order sent to LLM to prevent positional bias
```

**Structured Prompt Engineering (`backend/llm.js:3-21`)**:
- System prompt defines 0-30 damage range and JSON response format
- Encourages creativity: "Reward unique, creative, out-of-the-box or meta prompts"
- Explicitly prevents draws: "DO NOT allow a draw"

**Damage Application (`backend/server.js:222-227`)**:
- Player 1 receives `player2_damage` from opponent's prompt
- Player 2 receives `player1_damage` from opponent's prompt  
- Health clamped between 0-100: `Math.max(0, Math.min(100, health - damage))`

**Fallback System (`backend/llm.js:47-50`)**:
- Default 5 damage each if OpenAI unavailable
- Graceful degradation allows testing without API key

### UI/UX Design Philosophy

**Minimalist Dark Theme (`frontend/src/App.css`)**:
- Background: `#0a0a0a` with subtle gradients
- Typography: Light font weights (300-500) for elegance
- Interactive elements use gradient borders and hover transforms

**Key Style Patterns**:

**Gradient Buttons (`frontend/src/App.css:34-54`)**:
```css
background: linear-gradient(145deg, #1a1a1a, #2a2a2a);
border: 1px solid #333;
transition: all 0.2s ease;
transform: translateY(-1px); /* on hover */
```

**Health Bars (`frontend/src/App.css:137-145`)**:
- Green gradient: `linear-gradient(90deg, #4ade80, #22c55e)`
- Red when low: `linear-gradient(90deg, #ef4444, #dc2626)`  
- Smooth width transitions: `transition: width 0.3s ease`

**Responsive Design (`frontend/src/App.css:195-213`)**:
- Mobile-first approach with `@media (max-width: 768px)`
- Flexible layouts with CSS Grid for emoji selection
- Status messages hidden by default: `display: none` (`frontend/src/App.css:192`)

### State Management Patterns

**Real-time Synchronization (`frontend/src/components/GamePlay.js:15-38`)**:
- 1-second polling interval for game state updates
- Separate effects for different state concerns (timer, round transitions)
- Careful handling of tab switching and reconnection scenarios

**Timer Implementation (`frontend/src/components/GamePlay.js:79-99`)**:
- Client-side countdown synced with server timestamp
- Server provides `timerStartTime`, client calculates remaining time
- Prevents timer desync across browser tabs or network issues

**State Transitions (`frontend/src/components/GamePlay.js:62-76`)**:
- Round detection: `gameState?.roundNumber !== currentRound`  
- Automatic form reset on new rounds
- Clean separation of timer activation and game phase

### Development Considerations

**Environment Setup**:
- Conditional LLM loading (`backend/server.js:5-13`) allows development without OpenAI key
- Environment variable validation prevents accidental production issues
- Graceful fallback maintains game functionality

**Extensibility Points**:
1. Emoji options easily expandable (`frontend/src/components/PlayerSetup.js:4`)
2. Damage ranges configurable in LLM system prompt (`backend/llm.js:8`)
3. Timer duration adjustable (`backend/server.js:192`)
4. Health values and ranges modifiable (`backend/server.js:22-42`)

This prototype demonstrates a complete real-time multiplayer game with AI integration, ready for scaling to multiple simultaneous games, player accounts, and enhanced social features.

## Setup

1. Install dependencies for all parts of the project:
```bash
npm run install-all
```

2. Set up environment variables:
```bash
cd backend
cp .env.example .env
# Edit .env and add your OpenAI API key
```

```bash
cd ../frontend
cp .env.example .env
```

3. Back to root:
```bash
cd ..
```

## Development

Start both frontend and backend servers:
```bash
npm run dev
```

This will start:
- Frontend on http://localhost:3000
- Backend on http://localhost:3001
