import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL;

function CreateJoinGame() {
  const [gameCode, setGameCode] = useState('');
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createdGameCode, setCreatedGameCode] = useState('');
  const [showShare, setShowShare] = useState(false);
  const navigate = useNavigate();

  const createGame = async () => {
    setIsCreating(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/create-game`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error('Failed to create game');
      }
      
      const data = await response.json();
      setCreatedGameCode(data.gameCode);
      setShowShare(true);
    } catch (err) {
      setError('Failed to create game');
      setIsCreating(false);
    }
  };

  const joinGame = async () => {
    if (!gameCode.trim()) {
      setError('Please enter a game code');
      return;
    }

    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/join-game/${gameCode.trim().toUpperCase()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to join game');
      }
      
      const data = await response.json();
      navigate(`/game/${gameCode.trim().toUpperCase()}/${data.playerId}`);
    } catch (err) {
      setError(err.message);
    }
  };

  const joinCreatedGame = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/join-game/${createdGameCode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to join game');
      }
      
      const data = await response.json();
      navigate(`/game/${createdGameCode}/${data.playerId}`);
    } catch (err) {
      setError(err.message);
    }
  };

  const copyGameCode = () => {
    navigator.clipboard.writeText(createdGameCode);
  };

  const copyGameLink = () => {
    const gameLink = `${window.location.origin}/join/${createdGameCode}`;
    navigator.clipboard.writeText(gameLink);
  };

  if (showShare) {
    return (
      <div className="page-container">
        <h1 className="title">Game Created!</h1>
        <p className="subtitle">Share this code with your opponent</p>
        
        <div className="game-code-display">
          <div className="game-code">{createdGameCode}</div>
        </div>

        <div className="button-container">
          <button className="primary-button" onClick={copyGameCode}>
            Copy Code
          </button>
          <button className="primary-button" onClick={copyGameLink}>
            Copy Link
          </button>
        </div>

        <div className="button-container">
          <button className="secondary-button" onClick={joinCreatedGame}>
            Join Game
          </button>
          <button className="secondary-button" onClick={() => navigate('/')}>
            Back to Home
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="title">Create or Join Game</h1>
      
      <div className="game-option">
        <h2 className="option-title">Create New Game</h2>
        <p className="option-subtitle">Start a new game and get a shareable code</p>
        <button 
          className="primary-button" 
          onClick={createGame}
          disabled={isCreating}
        >
          {isCreating ? 'Creating...' : 'Create Game'}
        </button>
      </div>

      <div className="divider">OR</div>

      <div className="game-option">
        <h2 className="option-title">Join Existing Game</h2>
        <p className="option-subtitle">Enter a 6-character game code</p>
        <input
          type="text"
          className="game-code-input"
          placeholder="Enter game code"
          value={gameCode}
          onChange={(e) => setGameCode(e.target.value.toUpperCase())}
          maxLength={6}
        />
        <button className="primary-button" onClick={joinGame}>
          Join Game
        </button>
      </div>

      <div className="button-container">
        <button className="secondary-button" onClick={() => navigate('/')}>
          Back to Home
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}
    </div>
  );
}

export default CreateJoinGame;