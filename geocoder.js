// ============================================
// ANNAPP40 — GEOCODER
// Converteix nom de lloc a coordenades
// ============================================

const Geocoder = (() => {

  // Cache per no repetir peticions
  const _cache = {};

  async function geocode(placeName) {
    if (!placeName || placeName.trim().length < 2) return null;
    const key = placeName.trim().toLowerCase();
    if (_cache[key]) return _cache[key];

    try {
      // Usar Google Geocoding REST API (no depèn de Maps JS)
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(placeName)}&key=${CONFIG.MAPS_API_KEY}&language=ca`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Geocoding error ' + res.status);
      const data = await res.json();

      if (data.status === 'OK' && data.results.length > 0) {
        const loc = data.results[0].geometry.location;
        const result = { lat: loc.lat, lng: loc.lng, formatted: data.results[0].formatted_address };
        _cache[key] = result;
        return result;
      }
      return null;
    } catch(err) {
      console.warn('Geocoding error:', err);
      return null;
    }
  }

  // Autocomplete via Places API REST (funciona sense Maps JS)
  async function autocomplete(query) {
    if (!query || query.trim().length < 2) return [];
    try {
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&types=(cities)&key=${CONFIG.MAPS_API_KEY}&language=ca`;
      // Nota: CORS no permet cridar directament en producció
      // Usem el JS SDK si disponible, sinó geocodifiquem directament
      if (typeof google !== 'undefined' && google.maps?.places) {
        return await _autocompleteJS(query);
      }
      return [];
    } catch(err) {
      return [];
    }
  }

  function _autocompleteJS(query) {
    return new Promise((resolve) => {
      try {
        const service = new google.maps.places.AutocompleteService();
        service.getPlacePredictions(
          { input: query, types: ['(cities)'] },
          (predictions, status) => {
            if (!predictions || status !== 'OK') { resolve([]); return; }
            resolve(predictions.map(p => ({
              placeId:  p.place_id,
              text:     p.description,
              mainText: p.structured_formatting?.main_text || p.description,
            })));
          }
        );
      } catch(e) { resolve([]); }
    });
  }

  async function geocodeByPlaceId(placeId) {
    return new Promise((resolve) => {
      try {
        const geocoderJS = new google.maps.Geocoder();
        geocoderJS.geocode({ placeId }, (results, status) => {
          if (status === 'OK' && results[0]) {
            resolve({
              lat: results[0].geometry.location.lat(),
              lng: results[0].geometry.location.lng(),
            });
          } else resolve(null);
        });
      } catch(e) { resolve(null); }
    });
  }

  return { geocode, autocomplete, geocodeByPlaceId };
})();
