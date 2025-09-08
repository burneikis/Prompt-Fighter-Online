import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import LandingPage from './components/LandingPage';
import CreateJoinGame from './components/CreateJoinGame';
import PlayerSetup from './components/PlayerSetup';
import GamePlay from './components/GamePlay';
import JoinGameRedirect from './components/JoinGameRedirect';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/create-join" element={<CreateJoinGame />} />
          <Route path="/join/:gameCode" element={<JoinGameRedirect />} />
          <Route path="/game/:gameCode/:playerId" element={<PlayerSetup />} />
          <Route path="/play/:gameCode/:playerId" element={<GamePlay />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
