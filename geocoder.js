// ============================================
// ANNAPP40 — GEOCODER v2
// Usa Maps JS SDK (inclòs amb Maps JavaScript API)
// ============================================

const Geocoder = (() => {
  const _cache = {};

  function geocode(placeName) {
    return new Promise((resolve) => {
      if (!placeName || placeName.trim().length < 2) { resolve(null); return; }
      const key = placeName.trim().toLowerCase();
      if (_cache[key]) { resolve(_cache[key]); return; }
      if (typeof google === 'undefined' || !google.maps?.Geocoder) {
        resolve(null); return;
      }
      const gc = new google.maps.Geocoder();
      gc.geocode({ address: placeName }, (results, status) => {
        if (status === 'OK' && results[0]) {
          const result = {
            lat: results[0].geometry.location.lat(),
            lng: results[0].geometry.location.lng(),
          };
          _cache[key] = result;
          resolve(result);
        } else {
          resolve(null);
        }
      });
    });
  }

  function autocomplete(query) {
    return new Promise((resolve) => {
      if (!query || query.trim().length < 2) { resolve([]); return; }
      if (typeof google === 'undefined' || !google.maps?.places?.AutocompleteService) {
        resolve([]); return;
      }
      try {
        const service = new google.maps.places.AutocompleteService();
        service.getPlacePredictions(
          { input: query, types: ['(cities)'] },
          (predictions, status) => {
            if (!predictions || status !== google.maps.places.PlacesServiceStatus.OK) {
              resolve([]); return;
            }
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

  function geocodeByPlaceId(placeId) {
    return new Promise((resolve) => {
      if (typeof google === 'undefined' || !google.maps?.Geocoder) { resolve(null); return; }
      try {
        const gc = new google.maps.Geocoder();
        gc.geocode({ placeId }, (results, status) => {
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
