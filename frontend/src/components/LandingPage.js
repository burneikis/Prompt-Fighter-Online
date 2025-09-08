import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL;

function LandingPage() {
  const [backendStatus, setBackendStatus] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/health`)
      .then(res => res.json())
      .then(data => setBackendStatus(data.message))
      .catch(() => setBackendStatus('Failed to connect to backend'));
  }, []);

  const handlePlayerSelect = (playerId) => {
    navigate(`/player/${playerId}`);
  };

  return (
    <div className="page-container">
      <h1 className="title">Prompt Fighter</h1>
      <p className="subtitle">Battle with words.</p>
      
      <div className="button-container">
        <button 
          className="primary-button" 
          onClick={() => handlePlayerSelect(1)}
        >
          Player 1
        </button>
        <button 
          className="primary-button" 
          onClick={() => handlePlayerSelect(2)}
        >
          Player 2
        </button>
      </div>

      <div className="status-message">
        Backend: {backendStatus}
      </div>
    </div>
  );
}

export default LandingPage;