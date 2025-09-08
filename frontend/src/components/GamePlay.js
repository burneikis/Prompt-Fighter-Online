import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL;

function GamePlay() {
  const { gameCode, playerId } = useParams();
  const navigate = useNavigate();
  const [gameState, setGameState] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const [currentRound, setCurrentRound] = useState(null);
  const [timerActive, setTimerActive] = useState(false);

  const pollGameState = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/game-state/${gameCode}/${playerId}`);
      if (response.ok) {
        const data = await response.json();
        setGameState(data.gameState);
        
        // State synchronization is now handled in the main useEffect
        // to properly handle round transitions and tab switching
        
        // If game was reset (both players disconnected), redirect to landing
        if (data.gameState.gamePhase === 'waiting' && 
            !data.gameState.player1.connected && 
            !data.gameState.player2.connected) {
          navigate('/');
          return;
        }
        
        // Don't reset prompt here - it's handled in the main useEffect
      }
    } catch (err) {
      console.error('Failed to poll game state:', err);
    }
  }, [gameCode, playerId, navigate]); 

  const handleSubmitPrompt = useCallback(async () => {
    if (isSubmitted) return;
    
    setIsSubmitted(true);
    
    try {
      await fetch(`${API_BASE_URL}/api/submit-prompt/${gameCode}/${playerId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
    } catch (err) {
      console.error('Failed to submit prompt:', err);
    }
  }, [isSubmitted, prompt, gameCode, playerId]);

  useEffect(() => {
    pollGameState();
    const interval = setInterval(pollGameState, 1000);
    return () => clearInterval(interval);
  }, [pollGameState]);

  useEffect(() => {
    // Reset state when entering a new prompt phase round
    if (gameState?.gamePhase === 'prompt_phase' && 
        gameState?.roundNumber !== currentRound) {
      setCurrentRound(gameState.roundNumber);
      setTimerActive(true);
      setPrompt('');
      setIsSubmitted(false);
    }
    
    // Stop timer when leaving prompt phase
    if (gameState?.gamePhase !== 'prompt_phase') {
      setTimerActive(false);
    }
  }, [gameState?.gamePhase, gameState?.roundNumber, currentRound]);

  // Separate effect for timer countdown
  useEffect(() => {
    if (!timerActive || !gameState?.timerStartTime) {
      return;
    }

    const interval = setInterval(() => {
      const elapsed = (Date.now() - gameState.timerStartTime) / 1000;
      const remaining = Math.max(0, 60 - elapsed);
      setTimeRemaining(Math.floor(remaining));
      
      if (remaining <= 0) {
        // Before auto-submitting, check if we're actually still in prompt phase
        // and that we haven't already submitted (handles tab switching edge cases)
        if (gameState?.gamePhase === 'prompt_phase' && !isSubmitted) {
          handleSubmitPrompt();
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [timerActive, gameState?.timerStartTime, gameState?.gamePhase, isSubmitted, handleSubmitPrompt]);

  const resetGame = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/reset-game`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      navigate('/');
    } catch (err) {
      console.error('Failed to reset game:', err);
    }
  };

  if (!gameState) {
    return (
      <div className="page-container">
        <h1 className="title">Loading...</h1>
      </div>
    );
  }

  const currentPlayer = gameState[`player${playerId}`];
  const otherPlayer = gameState[`player${playerId === '1' ? '2' : '1'}`];

  if (gameState.gamePhase === 'game_over') {
    return (
      <div className="page-container">
        <div className="winner-display">
          {gameState.winner === 'tie' ? '🤝 It\'s a Tie!' : 
           gameState.winner === playerId ? '🎉 You Win!' : '💀 You Lose!'}
        </div>
        <div className="health-display">
          <div className="player-health">
            <div className="player-name">
              {currentPlayer.emoji} Player {playerId} (You)
            </div>
            <div className="health-bar">
              <div 
                className={`health-fill ${currentPlayer.health <= 25 ? 'low' : ''}`}
                style={{ width: `${currentPlayer.health}%` }}
              ></div>
            </div>
            <div>{currentPlayer.health}/100 HP</div>
          </div>
          <div className="player-health">
            <div className="player-name">
              {otherPlayer.emoji} Player {playerId === '1' ? '2' : '1'}
            </div>
            <div className="health-bar">
              <div 
                className={`health-fill ${otherPlayer.health <= 25 ? 'low' : ''}`}
                style={{ width: `${otherPlayer.health}%` }}
              ></div>
            </div>
            <div>{otherPlayer.health}/100 HP</div>
          </div>
        </div>
        <button className="primary-button" onClick={resetGame}>
            Home
        </button>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="game-container">
        <h1 className="title">Round {gameState.roundNumber}</h1>
        {/* <p className="subtitle">Game Code: {gameCode}</p> */}
        
        <div className="health-display">
          <div className="player-health">
            <div className="player-name">
              {currentPlayer.emoji} Player {playerId} (You)
            </div>
            <div className="health-bar">
              <div 
                className={`health-fill ${currentPlayer.health <= 25 ? 'low' : ''}`}
                style={{ width: `${currentPlayer.health}%` }}
              ></div>
            </div>
            <div>{currentPlayer.health}/100 HP</div>
          </div>
          <div className="player-health">
            <div className="player-name">
              {otherPlayer.emoji} Player {playerId === '1' ? '2' : '1'}
            </div>
            <div className="health-bar">
              <div 
                className={`health-fill ${otherPlayer.health <= 25 ? 'low' : ''}`}
                style={{ width: `${otherPlayer.health}%` }}
              ></div>
            </div>
            <div>{otherPlayer.health}/100 HP</div>
          </div>
        </div>

        {gameState.gamePhase === 'prompt_phase' && (
          <div className="prompt-area">
            <div className={`timer ${timeRemaining <= 10 ? 'warning' : ''}`}>
              {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
            </div>
            
            <textarea
              className="prompt-input"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Write your prompt here. You can attack your opponent's emoji or heal your own..."
              disabled={isSubmitted}
            />
            
            <div className="button-container" style={{ marginTop: '1rem' }}>
              <button 
                className="primary-button" 
                onClick={handleSubmitPrompt}
                disabled={isSubmitted}
              >
                {isSubmitted ? 'Submitted ✓' : 'Submit Prompt'}
              </button>
            </div>

            <div className="status-message">
              {isSubmitted && !otherPlayer.promptSubmitted && 
                'Waiting for opponent to submit their prompt...'
              }
              {isSubmitted && otherPlayer.promptSubmitted && 
                'Both prompts submitted. Evaluating...'
              }
              {!isSubmitted && 
                'Write a prompt to attack your opponent or heal yourself!'
              }
            </div>
          </div>
        )}

        {gameState.gamePhase === 'evaluation' && (
          <div className="status-message">
            <h2>Evaluating prompts...</h2>
            <p>Results will be shown shortly!</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default GamePlay;