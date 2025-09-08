import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL;

function JoinGameRedirect() {
  const { gameCode } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [isJoining, setIsJoining] = useState(true);

  useEffect(() => {
    const joinGame = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/join-game/${gameCode.toUpperCase()}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to join game');
        }
        
        const data = await response.json();
        navigate(`/game/${gameCode.toUpperCase()}/${data.playerId}`);
      } catch (err) {
        setError(err.message);
        setIsJoining(false);
      }
    };

    if (gameCode) {
      joinGame();
    } else {
      setError('Invalid game code');
      setIsJoining(false);
    }
  }, [gameCode, navigate]);

  if (isJoining) {
    return (
      <div className="page-container">
        <h1 className="title">Joining Game...</h1>
        <p className="subtitle">Game Code: {gameCode}</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="title">Unable to Join Game</h1>
      <p className="subtitle">Game Code: {gameCode}</p>
      <div className="error-message">{error}</div>
      <button className="primary-button" onClick={() => navigate('/')}>
        Back to Home
      </button>
    </div>
  );
}

export default JoinGameRedirect;