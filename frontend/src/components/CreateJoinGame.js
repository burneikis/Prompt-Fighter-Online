import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL;

function CreateJoinGame() {
  const [gameCode, setGameCode] = useState('');
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
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
      
      // Automatically join as Player 1
      const joinResponse = await fetch(`${API_BASE_URL}/api/join-game/${data.gameCode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!joinResponse.ok) {
        throw new Error('Failed to join created game');
      }
      
      const joinData = await joinResponse.json();
      navigate(`/game/${data.gameCode}/${joinData.playerId}`);
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
          placeholder="CODE HERE"
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