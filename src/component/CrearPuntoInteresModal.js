// este compoenente se abre al hacer click ene l boton nuevo punto de interes ubicado en MapComponent
import React, { useState, useEffect } from 'react';
import MapSelector from './MapSelector';
import axios from 'axios';
import Swal from 'sweetalert2';

const API_BASE_URL = 'http://localhost:8080/api';

const CrearPuntoInteresModal = ({ onClose, onPuntoCreado }) => {
    // Estados del formulario
    const [formData, setFormData] = useState({
        nombre: '',
        descripcion: '',
        categoria: '',
        direccion: '',
        telefono: '',
        email: '',
        website: '',
        latitud: null,
        longitud: null
    });

    // Estados auxiliares
    const [categorias, setCategorias] = useState([]);
    const [loading, setLoading] = useState(false);
    const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

    // Cargar categorías al montar el componente
    useEffect(() => {
        cargarCategorias();
    }, []);

    const cargarCategorias = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/puntos/categorias`);
            setCategorias(response.data);
        } catch (error) {
            console.error('Error cargando categorías:', error);
            setMensaje({ tipo: 'error', texto: 'Error al cargar las categorías' });
        }
    };

    // Función para crear punto de interés
    const crearPuntoInteres = async (puntoData) => {
        try {
            setLoading(true);
            const response = await axios.post(`${API_BASE_URL}/puntos`, puntoData);
            return response.data;
        } catch (error) {
            console.error('Error creando punto de interés:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    // Manejar cambios en los inputs
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [name]: value
        }));
    };

    // Manejar selección de ubicación en el mapa
    const handleLocationSelect = (lat, lng) => {
        setFormData(prevState => ({
            ...prevState,
            latitud: lat,
            longitud: lng
        }));
        setMensaje({ tipo: 'success', texto: `Ubicación seleccionada: ${lat.toFixed(6)}, ${lng.toFixed(6)}` });
    };

    // Manejar envío del formulario
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validaciones básicas
        if (!formData.nombre.trim()) {
            setMensaje({ tipo: 'error', texto: 'El nombre es obligatorio' });
            return;
        }

        if (!formData.latitud || !formData.longitud) {
            setMensaje({ tipo: 'error', texto: 'Debe seleccionar una ubicación en el mapa' });
            return;
        }

        if (!formData.categoria) {
            setMensaje({ tipo: 'error', texto: 'Debe seleccionar una categoría' });
            return;
        }
        // llamo al funcion para crear el nuevo punto de interes
        try {
            const nuevoPunto = await crearPuntoInteres(formData);
            //setMensaje({ tipo: 'success', texto: 'Punto de interés creado exitosamente' });
            Swal.fire({
                icon: 'success',
                title: '¡Éxito!',
                text: 'Punto de interés creado exitosamente',
                timer: 3000,
                showConfirmButton: false
            });

            // Llamar callback para notificar al componente padre
            if (onPuntoCreado) {
                onPuntoCreado(nuevoPunto);
            }

        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.response?.data?.message || 'Error al crear el punto de interés',
            });
        }
    };

    // Estilos del modal
    const modalStyles = {
        overlay: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        },
        modal: {
            backgroundColor: 'white',
            borderRadius: '8px',
            maxWidth: '1200px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
        },
        header: {
            padding: '20px',
            borderBottom: '1px solid #eee',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        },
        content: {
            padding: '20px',
            display: 'flex',
            gap: '20px',
            flexWrap: 'wrap'
        },
        form: {
            flex: '1',
            minWidth: '300px'
        },
        mapContainer: {
            flex: '1',
            minWidth: '400px'
        }
    };

    return (
        <div style={modalStyles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div style={modalStyles.modal}>
                {/* Header del modal */}
                <div style={modalStyles.header}>
                    <h2 style={{ margin: 0 }}>Crear Nuevo Punto de Interés</h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '24px',
                            cursor: 'pointer',
                            color: '#666'
                        }}
                    >
                        ×
                    </button>
                </div>

                {/* Contenido del modal */}
                <div style={modalStyles.content}>
                    {/* Formulario */}
                    <div style={modalStyles.form}>
                        {/* Mensaje de estado */}
                        {mensaje.texto && (
                            <div style={{
                                padding: '10px',
                                marginBottom: '20px',
                                borderRadius: '4px',
                                backgroundColor: mensaje.tipo === 'error' ? '#ffebee' : '#e8f5e8',
                                color: mensaje.tipo === 'error' ? '#c62828' : '#2e7d32',
                                border: `1px solid ${mensaje.tipo === 'error' ? '#ffcdd2' : '#c8e6c9'}`
                            }}>
                                {mensaje.texto}
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                    Nombre *
                                </label>
                                <input
                                    type="text"
                                    name="nombre"
                                    value={formData.nombre}
                                    onChange={handleInputChange}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        border: '1px solid #ddd',
                                        borderRadius: '4px',
                                        fontSize: '14px'
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                    Descripción
                                </label>
                                <textarea
                                    name="descripcion"
                                    value={formData.descripcion}
                                    onChange={handleInputChange}
                                    rows="3"
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        border: '1px solid #ddd',
                                        borderRadius: '4px',
                                        fontSize: '14px',
                                        resize: 'vertical'
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                    Categoría *
                                </label>
                                <select
                                    name="categoria"
                                    value={formData.categoria}
                                    onChange={handleInputChange}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        border: '1px solid #ddd',
                                        borderRadius: '4px',
                                        fontSize: '14px'
                                    }}
                                >
                                    <option value="">Seleccionar categoría</option>
                                    {categorias.map((categoria) => (
                                        <option key={categoria.id || categoria} value={categoria.nombre || categoria}>
                                            {categoria.nombre || categoria}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                    Dirección
                                </label>
                                <input
                                    type="text"
                                    name="direccion"
                                    value={formData.direccion}
                                    onChange={handleInputChange}
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        border: '1px solid #ddd',
                                        borderRadius: '4px',
                                        fontSize: '14px'
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                    Teléfono
                                </label>
                                <input
                                    type="tel"
                                    name="telefono"
                                    value={formData.telefono}
                                    onChange={handleInputChange}
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        border: '1px solid #ddd',
                                        borderRadius: '4px',
                                        fontSize: '14px'
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                    Email
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        border: '1px solid #ddd',
                                        borderRadius: '4px',
                                        fontSize: '14px'
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                    Website
                                </label>
                                <input
                                    type="url"
                                    name="website"
                                    value={formData.website}
                                    onChange={handleInputChange}
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        border: '1px solid #ddd',
                                        borderRadius: '4px',
                                        fontSize: '14px'
                                    }}
                                />
                            </div>

                            {/* Mostrar coordenadas seleccionadas */}
                            {formData.latitud && formData.longitud && (
                                <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                                    <strong>Ubicación seleccionada:</strong><br />
                                    Latitud: {formData.latitud.toFixed(6)}<br />
                                    Longitud: {formData.longitud.toFixed(6)}
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    style={{
                                        backgroundColor: '#6c757d',
                                        color: 'white',
                                        padding: '10px 20px',
                                        border: 'none',
                                        borderRadius: '4px',
                                        fontSize: '16px',
                                        cursor: 'pointer',
                                        flex: '1'
                                    }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    style={{
                                        backgroundColor: loading ? '#ccc' : '#007bff',
                                        color: 'white',
                                        padding: '10px 20px',
                                        border: 'none',
                                        borderRadius: '4px',
                                        fontSize: '16px',
                                        cursor: loading ? 'not-allowed' : 'pointer',
                                        flex: '2'
                                    }}
                                >
                                    {loading ? 'Creando...' : 'Crear Punto de Interés'}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Mapa selector */}
                    <div style={modalStyles.mapContainer}>
                        <MapSelector onLocationSelect={handleLocationSelect} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CrearPuntoInteresModal;