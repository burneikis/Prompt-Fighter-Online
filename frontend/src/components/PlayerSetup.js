import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL;
const EMOJI_OPTIONS = ['⚔️', '🛡️', '🔥', '❄️', '⚡', '🌟', '💎', '🎯', '🏹', '🔮', '🗡️', '🛸', '🐉', '🦅', '🐺', '🦄'];

function PlayerSetup() {
  const { playerId } = useParams();
  const navigate = useNavigate();
  const [gameState, setGameState] = useState(null);
  const [selectedEmoji, setSelectedEmoji] = useState('');
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState('');

  const connectToGame = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/connect/${playerId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error('Failed to connect');
      }
      
      const data = await response.json();
      setGameState(data.gameState);
      setIsConnecting(false);
    } catch (err) {
      setError('Failed to connect to game');
      setIsConnecting(false);
    }
  }, [playerId]);

  const pollGameState = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/game-state/${playerId}`);
      if (response.ok) {
        const data = await response.json();
        setGameState(data.gameState);
      }
    } catch (err) {
      console.error('Failed to poll game state:', err);
    }
  }, [playerId]);

  useEffect(() => {
    connectToGame();
    const interval = setInterval(pollGameState, 1000);
    return () => clearInterval(interval);
  }, [playerId, connectToGame, pollGameState]);

  useEffect(() => {
    if (gameState?.gamePhase === 'prompt_phase') {
      navigate(`/game/${playerId}`);
    }
  }, [gameState, playerId, navigate]);

  const selectEmoji = async (emoji) => {
    setSelectedEmoji(emoji);
    try {
      const response = await fetch(`${API_BASE_URL}/api/select-emoji/${playerId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji })
      });
      
      if (!response.ok) {
        throw new Error('Failed to select emoji');
      }
      
      const data = await response.json();
      setGameState(data.gameState);
    } catch (err) {
      setError('Failed to select emoji');
    }
  };

  if (isConnecting) {
    return (
      <div className="page-container">
        <h1 className="title">Connecting...</h1>
        <p className="subtitle">Player {playerId}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <h1 className="title">Error</h1>
        <p className="subtitle">{error}</p>
        <button className="primary-button" onClick={() => window.location.href = '/'}>
          Back to Home
        </button>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="page-container">
        <h1 className="title">Loading...</h1>
      </div>
    );
  }

  const currentPlayer = gameState[`player${playerId}`];
  const otherPlayer = gameState[`player${playerId === '1' ? '2' : '1'}`];

  return (
    <div className="page-container">
      <h1 className="title">Player {playerId}</h1>
      
      {gameState.gamePhase === 'waiting' && (
        <div>
          <p className="subtitle">Waiting for other player to join...</p>
          <div className="status-message">
            Player 1: {gameState.player1.connected ? '✓ Connected' : '⏳ Waiting'}
            <br />
            Player 2: {gameState.player2.connected ? '✓ Connected' : '⏳ Waiting'}
          </div>
        </div>
      )}

      {gameState.gamePhase === 'emoji_selection' && (
        <div>
          <p className="subtitle">Choose your fighter emoji</p>
          
          <div className="emoji-grid">
            {EMOJI_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                className={`emoji-button ${selectedEmoji === emoji ? 'selected' : ''}`}
                onClick={() => selectEmoji(emoji)}
                disabled={currentPlayer.emoji !== null}
              >
                {emoji}
              </button>
            ))}
          </div>

          {currentPlayer.emoji && (
            <div className="status-message">
              You selected: {currentPlayer.emoji}
              <br />
              {otherPlayer.emoji ? 
                `Opponent selected: ${otherPlayer.emoji}` : 
                'Waiting for opponent to select emoji...'
              }
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default PlayerSetup;