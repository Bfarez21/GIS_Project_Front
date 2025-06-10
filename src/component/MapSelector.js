// MapSelector es un mapa independiente que sirve para seleccionar las coordenadas
// solo se debe dar click en cualquier parte del mapa y tomara las coordenadas
import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Configurar iconos de Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Componente para manejar clicks en el mapa
const MapClickHandler = ({ onLocationSelect }) => {
  useMapEvents({
    click: (e) => {
      const { lat, lng } = e.latlng;
      onLocationSelect(lat, lng);
    }
  });
  return null;
};

const MapSelector = ({ onLocationSelect }) => {
  const [markerPosition, setMarkerPosition] = useState(null);

  const handleLocationSelect = (lat, lng) => {
    setMarkerPosition([lat, lng]);
    if (onLocationSelect) {
      onLocationSelect(lat, lng);
    }
  };

  return (
    <div>
      <h3 style={{ marginTop: 0, marginBottom: '10px' }}>Seleccionar Ubicación</h3>
      <p style={{ 
        fontSize: '14px', 
        color: '#666', 
        marginBottom: '10px',
        lineHeight: '1.4'
      }}>
        Haz clic en el mapa para seleccionar la ubicación del punto de interés
      </p>
      
      <div style={{ 
        height: '400px', 
        border: '1px solid #ddd', 
        borderRadius: '4px',
        overflow: 'hidden'
      }}>
        <MapContainer
          center={[-2.9001, -79.0059]} // Coordenadas de Cuenca, Ecuador
          zoom={13}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          <MapClickHandler onLocationSelect={handleLocationSelect} />
          
          {markerPosition && (
            <Marker position={markerPosition} />
          )}
        </MapContainer>
      </div>

      {markerPosition && (
        <div style={{ 
          marginTop: '10px', 
          padding: '8px', 
          backgroundColor: '#e8f5e8', 
          borderRadius: '4px',
          fontSize: '12px',
          color: '#2e7d32'
        }}>
          <strong>✓ Ubicación seleccionada:</strong><br />
          Lat: {markerPosition[0].toFixed(6)}, Lng: {markerPosition[1].toFixed(6)}
        </div>
      )}
    </div>
  );
};

export default MapSelector;