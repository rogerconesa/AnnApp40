// ============================================
// ANNAPP40 — GEOCODER v3
// Usa Places API (New) + Geocoding API via Maps JS SDK
// ============================================

const Geocoder = (() => {
  const _cache = {};
  let _placesLib = null;

  // Carregar Places library (nova API)
  async function _getPlacesLib() {
    if (_placesLib) return _placesLib;
    if (typeof google === 'undefined') return null;
    try {
      _placesLib = await google.maps.importLibrary('places');
      return _placesLib;
    } catch(e) {
      console.warn('Places library error:', e);
      return null;
    }
  }

  // Autocomplete via nova API
  async function autocomplete(query) {
    if (!query || query.trim().length < 2) return [];
    const lib = await _getPlacesLib();
    if (!lib) return [];

    try {
      const { AutocompleteSuggestion } = lib;
      const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: query,
        includedPrimaryTypes: ['locality', 'administrative_area_level_2', 'administrative_area_level_1'],
      });

      return (suggestions || []).map(s => {
        const p = s.placePrediction;
        return {
          placeId:  p.placeId,
          text:     p.text.toString(),
          mainText: p.mainText?.toString() || p.text.toString(),
          _prediction: p,
        };
      });
    } catch(e) {
      console.warn('Autocomplete error:', e);
      return [];
    }
  }

  // Obtenir coordenades per placeId (nova API)
  async function geocodeByPlaceId(placeId) {
    const lib = await _getPlacesLib();
    if (!lib) return null;
    try {
      const { Place } = lib;
      const place = new Place({ id: placeId });
      await place.fetchFields({ fields: ['location'] });
      if (place.location) {
        return { lat: place.location.lat(), lng: place.location.lng() };
      }
      return null;
    } catch(e) {
      // Fallback: Geocoder clàssic
      return _geocodeByPlaceIdLegacy(placeId);
    }
  }

  function _geocodeByPlaceIdLegacy(placeId) {
    return new Promise((resolve) => {
      if (typeof google === 'undefined' || !google.maps?.Geocoder) { resolve(null); return; }
      const gc = new google.maps.Geocoder();
      gc.geocode({ placeId }, (results, status) => {
        if (status === 'OK' && results[0]) {
          resolve({
            lat: results[0].geometry.location.lat(),
            lng: results[0].geometry.location.lng(),
          });
        } else resolve(null);
      });
    });
  }

  // Geocodificar per nom (fallback quan no hi ha placeId)
  async function geocode(placeName) {
    if (!placeName || placeName.trim().length < 2) return null;
    const key = placeName.trim().toLowerCase();
    if (_cache[key]) return _cache[key];

    // Primer intentar autocomplete i agafar el primer resultat
    try {
      const suggestions = await autocomplete(placeName);
      if (suggestions.length > 0) {
        const coords = await geocodeByPlaceId(suggestions[0].placeId);
        if (coords) { _cache[key] = coords; return coords; }
      }
    } catch(e) {}

    // Fallback: Geocoder clàssic per nom
    return new Promise((resolve) => {
      if (typeof google === 'undefined' || !google.maps?.Geocoder) { resolve(null); return; }
      const gc = new google.maps.Geocoder();
      gc.geocode({ address: placeName }, (results, status) => {
        if (status === 'OK' && results[0]) {
          const result = {
            lat: results[0].geometry.location.lat(),
            lng: results[0].geometry.location.lng(),
          };
          _cache[key] = result;
          resolve(result);
        } else resolve(null);
      });
    });
  }

  return { geocode, autocomplete, geocodeByPlaceId };
})();
