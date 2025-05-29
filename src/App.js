import logo from './logo.svg';
import './App.css';
import MapComponent from './component/MapComponent';

function App() {
   return (
    <div className="App">
      <header style={{ 
        backgroundColor: '#2c3e50', 
        color: 'white', 
        padding: '10px 20px',
        textAlign: 'center'
      }}>
        <h1>Sistema GIS - Puntos de Interés</h1>
      </header>
      <MapComponent />
    </div>
  );
}

export default App;
