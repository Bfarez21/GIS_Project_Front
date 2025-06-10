import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet'; //Para la integración de mapas Leaflet con React
import axios from 'axios'; //Para hacer peticiones HTTP a APIs
import L from 'leaflet'; // Biblioteca principal para mapas
import 'leaflet/dist/leaflet.css'; //Estilos CSS base de Leaflet
import CrearPuntoInteresModal from './CrearPuntoInteresModal';

// Fix para iconos de Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const API_BASE_URL = 'http://localhost:8080/api';

// NUEVO: Iconos personalizados por categoría
const iconosPorCategoria = {
  'Restaurante': '🍴',
  'Hospital': '🏥',
  'Escuela': '🏫',
  'Parque': '🌳',
  'Banco': '🏦'
};

const crearIconoPersonalizado = (categoria) => {
  return L.divIcon({
    html: `<div style="background: #4285F4; border-radius: 50%; 
           width: 30px; height: 30px; display: flex; 
           align-items: center; justify-content: center; 
           font-size: 16px; color: white; border: 2px solid white;
           box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
           ${iconosPorCategoria[categoria] || '📍'}
           </div>`,
    className: 'custom-marker',
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });
};

// NUEVO: Componente para manejar rutas
const RutaComponent = ({ origen, destino, onRutaCalculada }) => {
  const map = useMap();
  const rutaRef = useRef(null);

  useEffect(() => {
    if (origen && destino) {
      calcularRuta();
    }

    return () => {
      if (rutaRef.current) {
        map.removeLayer(rutaRef.current);
      }
    };
  }, [origen, destino, map]);

  const calcularRuta = async () => {
    try {
      // Limpiar ruta anterior
      if (rutaRef.current) {
        map.removeLayer(rutaRef.current);
      }

      // Usar OpenRouteService (gratuito) para calcular la ruta
      const response = await axios.get(
        `https://api.openrouteservice.org/v2/directions/driving-car?api_key=5b3ce3597851110001cf6248c9b6c6a77eac478ca5f3ab5e2f3a0139&start=${origen.lng},${origen.lat}&end=${destino.lng},${destino.lat}`
        // `https://api.openrouteservice.org/v2/directions/driving-car?api_key=5b3ce3597851110001cf6248c9b6c6a77eac478ca5f3ab5e2f3a0139&start=${origen[1]},${origen[0]}&end=${destino[1]},${destino[0]}`
      );

      const coordinates = response.data.features[0].geometry.coordinates;
      const latLngs = coordinates.map(coord => [coord[1], coord[0]]);

      // Crear polyline para la ruta
      rutaRef.current = L.polyline(latLngs, {
        color: '#ff6b6b',
        weight: 5,
        opacity: 0.8,
        dashArray: '10, 5'
      }).addTo(map);

      // Ajustar vista del mapa para mostrar toda la ruta
      const bounds = L.latLngBounds([origen, destino]);
      map.fitBounds(bounds, { padding: [50, 50] });

      // Información de la ruta
      const duracion = response.data.features[0].properties.segments[0].duration;
      const distancia = response.data.features[0].properties.segments[0].distance;

      onRutaCalculada({
        duracion: Math.round(duracion / 60), // en minutos
        distancia: (distancia / 1000).toFixed(1) // en km
      });

    } catch (error) {
      console.error('Error calculando ruta:', error);
      // Fallback: línea recta
      if (rutaRef.current) {
        map.removeLayer(rutaRef.current);
      }
      rutaRef.current = L.polyline([origen, destino], {
        color: '#ff6b6b',
        weight: 3,
        opacity: 0.6,
        dashArray: '15, 10'
      }).addTo(map);

      onRutaCalculada({
        duracion: null,
        distancia: calcularDistanciaDirecta(origen, destino),
        error: "Ruta calculada en línea recta (sin acceso a servicio de rutas)"
      });
    }
  };

  const calcularDistanciaDirecta = (punto1, punto2) => {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (punto2[0] - punto1[0]) * Math.PI / 180;
    const dLon = (punto2[1] - punto1[1]) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(punto1[0] * Math.PI / 180) * Math.cos(punto2[0] * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(1);
  };

  return null;
};

const MapComponent = () => {
  const [puntos, setPuntos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [categorias, setCategorias] = useState([]);

  // Estados existentes
  const [busquedaTexto, setBusquedaTexto] = useState('');
  const [radioBusqueda, setRadioBusqueda] = useState(2000);
  const [puntoClick, setPuntoClick] = useState(null);
  const [ubicacionUsuario, setUbicacionUsuario] = useState(null);
  const [mostrarPanel, setMostrarPanel] = useState(true);
  const [puntoSeleccionado, setPuntoSeleccionado] = useState(null);

  // NUEVOS ESTADOS PARA RUTAS
  const [direccionDestino, setDireccionDestino] = useState('');
  const [coordenadasDestino, setCoordenadasDestino] = useState(null);
  const [infoRuta, setInfoRuta] = useState(null);
  const [mostrarRuta, setMostrarRuta] = useState(false);
  const [geocodificando, setGeocodificando] = useState(false);

  // Coordenadas de Cuenca, Ecuador
  const centro = [-2.8990, -78.9680];

  useEffect(() => {
    cargarPuntos();
    cargarCategorias();
  }, []);

  // ESTADOS PARA CREA PUNTOS INTERES
  const [puntosInteres, setPuntosInteres] = useState([]);
  const [showModal, setShowModal] = useState(false);

  // Función para manejar cuando se crea un nuevo punto
  const handlePuntoCreado = (nuevoPunto) => {
    setPuntosInteres(prevPuntos => [...prevPuntos, nuevoPunto]);
    setShowModal(false);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const cargarPuntos = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/puntos`);
      setPuntos(response.data);
    } catch (error) {
      console.error('Error cargando puntos:', error);
    } finally {
      setLoading(false);
    }
  };

  const cargarCategorias = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/puntos/categorias`);
      setCategorias(response.data);
    } catch (error) {
      console.error('Error cargando categorías:', error);
    }
  };

  const buscarCercanos = async (lat, lng) => {
    try {
      setPuntoClick([lat, lng]);
      const response = await axios.get(`${API_BASE_URL}/puntos/cercanos`, {
        params: { lat, lng, radio: radioBusqueda, categoria: filtroCategoria || null }
      });
      setPuntos(response.data);
    } catch (error) {
      console.error('Error buscando puntos cercanos:', error);
    }
  };

  const buscarPorTexto = (texto) => {
    setBusquedaTexto(texto);
  };

  const obtenerUbicacion = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUbicacionUsuario([latitude, longitude]);
          buscarCercanos(latitude, longitude);
        },
        (error) => {
          console.error('Error obteniendo ubicación:', error);
          alert('No se pudo obtener tu ubicación');
        }
      );
    } else {
      alert('Geolocalización no soportada');
    }
  };

  const centrarEnPunto = (punto) => {
    setPuntoSeleccionado(punto);
  };

  //  Geocodificar dirección
  const geocodificarDireccion = async (direccion) => {
    if (!direccion.trim()) return;

    setGeocodificando(true);
    try {
      // Usar Nominatim (OpenStreetMap) para geocodificación gratuita para buscar direcciones
      const response = await axios.get(`https://nominatim.openstreetmap.org/search`, {
        params: {
          q: `${direccion}, Cuenca, Ecuador`,
          format: 'json',
          limit: 1,
          addressdetails: 1
        }
      });

      if (response.data && response.data.length > 0) {
        const resultado = response.data[0];
        const coords = [parseFloat(resultado.lat), parseFloat(resultado.lon)];
        setCoordenadasDestino(coords);
        return coords;
      } else {
        alert('No se encontró la dirección especificada');
        return null;
      }
    } catch (error) {
      console.error('Error geocodificando:', error);
      alert('Error al buscar la dirección');
      return null;
    } finally {
      setGeocodificando(false);
    }
  };

  //  Calcular ruta
  const calcularRuta = async () => {
    if (!ubicacionUsuario) {
      alert('Primero obtén tu ubicación actual');
      return;
    }

    if (!direccionDestino.trim()) {
      alert('Ingresa una dirección de destino');
      return;
    }

    const destino = await geocodificarDireccion(direccionDestino);
    if (destino) {
      setMostrarRuta(true);
    }
  };

  // Limpiar ruta
  const limpiarRuta = () => {
    setMostrarRuta(false);
    setCoordenadasDestino(null);
    setInfoRuta(null);
    setDireccionDestino('');
  };

  //  Manejar información de ruta calculada
  const manejarRutaCalculada = (info) => {
    setInfoRuta(info);
  };

  // FILTROS COMBINADOS
  const puntosFiltrados = puntos.filter(punto => {
    const cumpleFiltroCategoria = !filtroCategoria || punto.categoria === filtroCategoria;
    const cumpleFiltroTexto = !busquedaTexto ||
      punto.nombre.toLowerCase().includes(busquedaTexto.toLowerCase()) ||
      (punto.descripcion && punto.descripcion.toLowerCase().includes(busquedaTexto.toLowerCase()));

    return cumpleFiltroCategoria && cumpleFiltroTexto;
  });

  const obtenerEstadisticas = () => {
    const stats = {};
    puntosFiltrados.forEach(punto => {
      stats[punto.categoria] = (stats[punto.categoria] || 0) + 1;
    });
    return stats;
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>

      {/* PANEL DE CONTROLES  CON RUTAS */}
      <div style={{
        padding: '15px',
        backgroundColor: '#f8f9fa',
        borderBottom: '2px solid #dee2e6',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>

          {/* Búsqueda por texto */}
          <input
            type="text"
            placeholder="Buscar por nombre o descripción..."
            value={busquedaTexto}
            onChange={(e) => buscarPorTexto(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              minWidth: '200px'
            }}
          />

          {/* Filtro por categoría */}
          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px' }}
          >
            <option value="">Todas las categorías</option>
            {categorias.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Control de radio */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label>Radio:</label>
            <input
              type="range"
              min="500"
              max="10000"
              step="500"
              value={radioBusqueda}
              onChange={(e) => setRadioBusqueda(parseInt(e.target.value))}
              style={{ width: '100px' }}
            />
            <span style={{ minWidth: '60px', fontSize: '12px' }}>{radioBusqueda}m</span>
          </div>

          {/* Botones principales */}
          <button
            onClick={obtenerUbicacion}
            style={{
              padding: '8px 12px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Mi ubicación
          </button>

          <button
            onClick={cargarPuntos}
            style={{
              padding: '8px 12px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Recargar
          </button>

          <span style={{
            marginLeft: 'auto',
            fontWeight: 'bold',
            color: '#495057'
          }}>
            Mostrando: {puntosFiltrados.length} de {puntos.length} puntos
          </span>
        </div>

        {/* NUEVA SECCIÓN: Controles de ruta */}
        <div style={{
          marginTop: '15px',
          padding: '15px',
          backgroundColor: '#e3f2fd',
          borderRadius: '8px',
          border: '1px solid #bbdefb'
        }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <strong style={{ color: '#1976d2' }}> Rutas:</strong>

            <input
              type="text"
              placeholder="Ingresa dirección de destino..."
              value={direccionDestino}
              onChange={(e) => setDireccionDestino(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #90caf9',
                borderRadius: '4px',
                minWidth: '250px',
                backgroundColor: 'white'
              }}
              onKeyPress={(e) => e.key === 'Enter' && calcularRuta()}
            />

            <button
              onClick={calcularRuta}
              disabled={geocodificando || !ubicacionUsuario}
              style={{
                padding: '8px 12px',
                backgroundColor: geocodificando ? '#ccc' : '#1976d2',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: geocodificando ? 'not-allowed' : 'pointer'
              }}
            >
              {geocodificando ? ' Buscando...' : ' Calcular ruta'}
            </button>

            {mostrarRuta && (
              <button
                onClick={limpiarRuta}
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Limpiar ruta
              </button>
            )}

            <button
              onClick={() => setMostrarPanel(!mostrarPanel)}
              style={{
                padding: '8px 12px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {mostrarPanel ? 'Cerrar' : 'Ver'} Panel
            </button>
            {/* Botón para crear nuevo punto */}
            <button
              onClick={() => setShowModal(true)}
              style={{
                padding: '8px 12px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = '#0056b3';
                e.target.style.transform = 'translateY(-2px)';
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = '#007bff';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              Nuevo Punto de Interés
            </button>
          </div>

          {/* Información de la ruta */}
          {infoRuta && (
            <div style={{
              marginTop: '10px',
              padding: '10px',
              backgroundColor: 'white',
              borderRadius: '4px',
              fontSize: '14px'
            }}>
              <strong>📊 Información de la ruta:</strong>
              <div style={{ marginTop: '5px' }}>
                {infoRuta.duracion && (
                  <span style={{ marginRight: '15px' }}>
                    ⏱️ Tiempo: {infoRuta.duracion} min
                  </span>
                )}
                <span style={{ marginRight: '15px' }}>
                  Distancia: {infoRuta.distancia} km
                </span>
                {infoRuta.error && (
                  <span style={{ color: '#ff9800', fontSize: '12px' }}>
                    ⚠️ {infoRuta.error}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PANEL LATERAL DE INFORMACIÓN */}
      {mostrarPanel && (
        <div style={{
          position: 'absolute',
          top: '180px',
          right: '10px',
          width: '320px',
          maxHeight: '65vh',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1000,
          overflow: 'hidden'
        }}>

          {/* Header del panel */}
          <div style={{
            padding: '15px',
            backgroundColor: '#f8f9fa',
            borderBottom: '1px solid #dee2e6'
          }}>
            <h3 style={{ margin: 0, color: '#495057' }}>Información</h3>
          </div>

          {/* Estadísticas */}
          <div style={{ padding: '15px', borderBottom: '1px solid #eee' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>Estadísticas</h4>
            <div style={{ fontSize: '14px', color: '#666' }}>
              <p style={{ margin: '5px 0' }}> Puntos visibles: {puntosFiltrados.length}</p>
              <p style={{ margin: '5px 0' }}> Total en base: {puntos.length}</p>
              {puntoClick && (
                <p style={{ margin: '5px 0' }}> Búsqueda en: {puntoClick[0].toFixed(4)}, {puntoClick[1].toFixed(4)}</p>
              )}
              {ubicacionUsuario && (
                <p style={{ margin: '5px 0' }}>📍 Tu ubicación: {ubicacionUsuario[0].toFixed(4)}, {ubicacionUsuario[1].toFixed(4)}</p>
              )}
            </div>

            {/* Distribución por categorías */}
            <div style={{ marginTop: '15px' }}>
              <h5 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>Por categorías:</h5>
              {Object.entries(obtenerEstadisticas()).map(([categoria, count]) => (
                <div key={categoria} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                  margin: '3px 0',
                  padding: '2px 8px',
                  backgroundColor: filtroCategoria === categoria ? '#e3f2fd' : 'transparent',
                  borderRadius: '3px'
                }}>
                  <span>{iconosPorCategoria[categoria]} {categoria}</span>
                  <span style={{ fontWeight: 'bold' }}>{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Lista de puntos */}
          <div style={{
            maxHeight: '250px',
            overflowY: 'auto'
          }}>
            <div style={{ padding: '10px 15px 5px', fontSize: '14px', fontWeight: 'bold', color: '#495057' }}>
              Puntos encontrados:
            </div>
            {puntosFiltrados.slice(0, 10).map(punto => (
              <div
                key={punto.id}
                style={{
                  padding: '10px 15px',
                  borderBottom: '1px solid #f0f0f0',
                  cursor: 'pointer',
                  backgroundColor: puntoSeleccionado?.id === punto.id ? '#e3f2fd' : 'white'
                }}
                onClick={() => centrarEnPunto(punto)}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                onMouseLeave={(e) => e.target.style.backgroundColor = puntoSeleccionado?.id === punto.id ? '#e3f2fd' : 'white'}
              >
                <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#333' }}>
                  {iconosPorCategoria[punto.categoria]} {punto.nombre}
                </div>
                <div style={{ fontSize: '12px', color: '#666', margin: '3px 0' }}>
                  {punto.categoria}
                </div>
                {punto.direccion && (
                  <div style={{ fontSize: '11px', color: '#888' }}>
                    📍 {punto.direccion}
                  </div>
                )}
              </div>
            ))}
            {puntosFiltrados.length > 10 && (
              <div style={{ padding: '10px 15px', fontSize: '12px', color: '#666', textAlign: 'center' }}>
                ... y {puntosFiltrados.length - 10} más
              </div>
            )}
          </div>
        </div>
      )}

      {/* MAPA */}
      <div style={{ flex: 1 }}>
        {loading ? (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            fontSize: '18px',
            color: '#666'
          }}>
            🌍 Cargando mapa...
          </div>
        ) : (
          <MapContainer
            center={centro}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            onClick={(e) => {
              const { lat, lng } = e.latlng;
              buscarCercanos(lat, lng);
            }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />

            {/* Componente de ruta */}
            {mostrarRuta && ubicacionUsuario && coordenadasDestino && (
              <RutaComponent
                origen={ubicacionUsuario}
                destino={coordenadasDestino}
                onRutaCalculada={manejarRutaCalculada}
              />
            )}

            {/* Círculo de búsqueda */}
            {puntoClick && (
              <Circle
                center={puntoClick}
                radius={radioBusqueda}
                pathOptions={{
                  color: '#007bff',
                  fillColor: '#007bff',
                  fillOpacity: 0.1,
                  weight: 2,
                  dashArray: '5, 5'
                }}
              />
            )}

            {/* Marcador de ubicación del usuario */}
            {ubicacionUsuario && (
              <Marker
                position={ubicacionUsuario}
                icon={L.divIcon({
                  html: `<div style="background: #28a745; border-radius: 50%; 
                         width: 20px; height: 20px; border: 3px solid white;
                         box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
                  className: 'user-location-marker',
                  iconSize: [20, 20],
                  iconAnchor: [10, 10]
                })}
              >
                <Popup>
                  <div>
                    <strong>Tu ubicación</strong>
                    <br />
                    <small>{ubicacionUsuario[0].toFixed(4)}, {ubicacionUsuario[1].toFixed(4)}</small>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Marcador de destino */}
            {coordenadasDestino && (
              <Marker
                position={coordenadasDestino}
                icon={L.divIcon({
                  html: `<div style="background: #ff6b6b; border-radius: 50%; 
                         width: 25px; height: 25px; border: 3px solid white;
                         box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex;
                         align-items: center; justify-content: center;
                         font-size: 12px; color: white;">🎯</div>`,
                  className: 'destination-marker',
                  iconSize: [25, 25],
                  iconAnchor: [12, 12]
                })}
              >
                <Popup>
                  <div>
                    <strong>Destino</strong>
                    <br />
                    <small>{direccionDestino}</small>
                    <br />
                    <small>{coordenadasDestino[0].toFixed(4)}, {coordenadasDestino[1].toFixed(4)}</small>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Marcadores de puntos de interés */}
            {puntosFiltrados.map(punto => (
              <Marker
                key={punto.id}
                position={[punto.latitud, punto.longitud]}
                icon={crearIconoPersonalizado(punto.categoria)}
              >
                <Popup maxWidth={300}>
                  <div style={{ minWidth: '250px' }}>
                    <h4 style={{ margin: '0 0 12px 0', color: '#333', borderBottom: '2px solid #eee', paddingBottom: '8px' }}>
                      {iconosPorCategoria[punto.categoria]} {punto.nombre}
                    </h4>

                    <div style={{ fontSize: '14px', lineHeight: '1.4' }}>
                      <p style={{ margin: '8px 0' }}>
                        <strong>📂 Categoría:</strong> {punto.categoria}
                      </p>

                      {punto.descripcion && (
                        <p style={{ margin: '8px 0' }}>
                          <strong>📝 Descripción:</strong> {punto.descripcion}
                        </p>
                      )}

                      {punto.direccion && (
                        <p style={{ margin: '8px 0' }}>
                          <strong>📍 Dirección:</strong> {punto.direccion}
                        </p>
                      )}

                      {punto.telefono && (
                        <p style={{ margin: '8px 0' }}>
                          <strong>📞 Teléfono:</strong>
                          <a href={`tel:${punto.telefono}`} style={{ marginLeft: '5px', color: '#007bff' }}>
                            {punto.telefono}
                          </a>
                        </p>
                      )}

                      {punto.email && (
                        <p style={{ margin: '8px 0' }}>
                          <strong>✉️ Email:</strong>
                          <a href={`mailto:${punto.email}`} style={{ marginLeft: '5px', color: '#007bff' }}>
                            {punto.email}
                          </a>
                        </p>
                      )}

                      {punto.website && (
                        <p style={{ margin: '8px 0' }}>
                          <strong>🌐 Web:</strong>
                          <a href={punto.website} target="_blank" rel="noopener noreferrer" style={{ marginLeft: '5px', color: '#007bff' }}>
                            Visitar sitio
                          </a>
                        </p>
                      )}

                      {/* NUEVO: Botón para calcular ruta a este punto */}
                      {ubicacionUsuario && (
                        <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px solid #eee' }}>
                          <button
                            onClick={() => {
                              setDireccionDestino(punto.direccion || punto.nombre);
                              setCoordenadasDestino([punto.latitud, punto.longitud]);
                              setMostrarRuta(true);
                            }}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#ff6b6b',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              width: '100%'
                            }}
                          >
                            Cómo llegar aquí
                          </button>
                        </div>
                      )}
                    </div>

                    <div style={{
                      marginTop: '12px',
                      paddingTop: '8px',
                      borderTop: '1px solid #eee',
                      fontSize: '12px',
                      color: '#666'
                    }}>
                      <em>Click en el mapa para buscar puntos cercanos</em>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}
        {/* llama al componente Modal para crear nuevo punto */}
        {showModal && (
          <CrearPuntoInteresModal
            onClose={handleCloseModal}
            onPuntoCreado={handlePuntoCreado}
          />
        )}
      </div>
    </div>
  );
};

export default MapComponent;