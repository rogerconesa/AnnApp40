// ============================================
// ANNA40 — MAP
// Mapa amb clusters + galeria al costat
// ============================================

const MapView = (() => {
  let _map        = null;
  let _markers    = [];
  let _allPhotos  = [];
  let _infoWindow = null;
  let _initialized= false;

  function init(photos) {
    _allPhotos = photos;
  }

  function updatePhotos(photos) {
    _allPhotos = photos;
    if (_initialized) _renderMarkers();
  }

  function show() {
    if (!_initialized) {
      _initMap();
      _initialized = true;
    } else {
      _renderMarkers();
    }
  }

  function _initMap() {
    if (typeof google === 'undefined') {
      document.getElementById('map-container').innerHTML =
        '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted)">Mapa no disponible</div>';
      return;
    }

    _map = new google.maps.Map(document.getElementById('map-container'), {
      center: { lat: 41.3851, lng: 2.1734 }, // Barcelona per defecte
      zoom: 6,
      styles: _darkMapStyle(),
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    });

    _infoWindow = new google.maps.InfoWindow();
    _renderMarkers();
  }

  function _renderMarkers() {
    if (!_map) return;

    // Eliminar markers antics
    _markers.forEach(m => m.setMap(null));
    _markers = [];

    // Filtrar fotos amb coordenades
    const withCoords = _allPhotos.filter(p => p.lat && p.lng);

    if (withCoords.length === 0) {
      document.getElementById('map-no-coords').classList.remove('hidden');
      document.getElementById('map-sidebar').innerHTML = '<p style="color:var(--text-muted);padding:1rem;font-size:0.85rem">Cap foto té ubicació registrada.</p>';
      return;
    }

    document.getElementById('map-no-coords').classList.add('hidden');

    // Agrupar per lloc
    const byLloc = {};
    withCoords.forEach(p => {
      const key = `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`;
      if (!byLloc[key]) byLloc[key] = { lat: p.lat, lng: p.lng, lloc: p.lloc, photos: [] };
      byLloc[key].photos.push(p);
    });

    const bounds = new google.maps.LatLngBounds();

    Object.values(byLloc).forEach(group => {
      const count  = group.photos.length;
      const marker = new google.maps.Marker({
        position: { lat: group.lat, lng: group.lng },
        map: _map,
        title: `${group.lloc} (${count} foto${count !== 1 ? 's' : ''})`,
        icon: _clusterIcon(count),
      });

      marker.addListener('click', () => {
        _showSidebar(group);
        _infoWindow.setContent(`
          <div style="font-family:DM Sans,sans-serif;padding:4px">
            <strong style="font-size:0.9rem">${group.lloc}</strong><br>
            <span style="font-size:0.78rem;color:#666">${count} foto${count !== 1 ? 's' : ''}</span>
          </div>
        `);
        _infoWindow.open(_map, marker);
      });

      _markers.push(marker);
      bounds.extend({ lat: group.lat, lng: group.lng });
    });

    if (_markers.length > 0) _map.fitBounds(bounds);

    // Sidebar inicial — totes les ubicacions
    _showAllLocations(byLloc);
  }

  function _clusterIcon(count) {
    const size  = count === 1 ? 32 : count < 5 ? 38 : 46;
    const color = count === 1 ? '#c8956c' : count < 5 ? '#d4a853' : '#e94560';
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
        <circle cx="${size/2}" cy="${size/2}" r="${size/2-2}" fill="${color}" opacity="0.9"/>
        <text x="${size/2}" y="${size/2+5}" text-anchor="middle" font-family="DM Sans,sans-serif"
          font-size="${count < 10 ? 13 : 11}" font-weight="700" fill="white">${count}</text>
      </svg>`;
    return {
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
      scaledSize: new google.maps.Size(size, size),
      anchor: new google.maps.Point(size/2, size/2),
    };
  }

  function _showAllLocations(byLloc) {
    const sidebar = document.getElementById('map-sidebar');
    sidebar.innerHTML = `<p class="map-sidebar-title">📍 ${Object.keys(byLloc).length} ubicacions</p>`;
    Object.values(byLloc).forEach(group => {
      const div = _locationCard(group);
      div.addEventListener('click', () => {
        _map.panTo({ lat: group.lat, lng: group.lng });
        _map.setZoom(10);
        _showSidebar(group);
      });
      sidebar.appendChild(div);
    });
  }

  function _showSidebar(group) {
    const sidebar = document.getElementById('map-sidebar');
    sidebar.innerHTML = `
      <button class="map-back-btn" id="map-back">← Totes les ubicacions</button>
      <p class="map-sidebar-title">📍 ${group.lloc}</p>
      <p class="map-sidebar-sub">${group.photos.length} foto${group.photos.length !== 1 ? 's' : ''}</p>
    `;
    document.getElementById('map-back').addEventListener('click', () => {
      const byLloc = {};
      _allPhotos.filter(p => p.lat && p.lng).forEach(p => {
        const key = `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`;
        if (!byLloc[key]) byLloc[key] = { lat: p.lat, lng: p.lng, lloc: p.lloc, photos: [] };
        byLloc[key].photos.push(p);
      });
      _showAllLocations(byLloc);
    });

    const grid = document.createElement('div');
    grid.className = 'map-photo-grid';
    group.photos.forEach(photo => {
      const img = document.createElement('img');
      img.src       = photo.url;
      img.className = 'map-photo-thumb';
      img.title     = `${photo.any} · ${photo.persones.join(', ')}`;
      img.addEventListener('click', () => Gallery.openLightbox(photo));
      grid.appendChild(img);
    });
    sidebar.appendChild(grid);
  }

  function _locationCard(group) {
    const div = document.createElement('div');
    div.className = 'map-location-card';
    const thumb = group.photos[0];
    div.innerHTML = `
      <img src="${thumb.url}" class="map-card-thumb" alt="${group.lloc}" />
      <div class="map-card-info">
        <div class="map-card-lloc">${group.lloc}</div>
        <div class="map-card-count">${group.photos.length} foto${group.photos.length !== 1 ? 's' : ''}</div>
        <div class="map-card-anys">${[...new Set(group.photos.map(p => p.any))].filter(Boolean).sort().join(', ')}</div>
      </div>
    `;
    return div;
  }

  function _darkMapStyle() {
    return [
      { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
      { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
      { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
      { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2c2c3e' }] },
      { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212a37' }] },
      { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
      { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#746855' }] },
      { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d1b2a' }] },
      { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#515c6d' }] },
      { featureType: 'poi', stylers: [{ visibility: 'off' }] },
      { featureType: 'transit', stylers: [{ visibility: 'off' }] },
      { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
    ];
  }

  return { init, updatePhotos, show };
})();
