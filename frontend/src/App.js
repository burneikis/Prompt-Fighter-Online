import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import LandingPage from './components/LandingPage';
import PlayerSetup from './components/PlayerSetup';
import GamePlay from './components/GamePlay';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/player/:playerId" element={<PlayerSetup />} />
          <Route path="/game/:playerId" element={<GamePlay />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
