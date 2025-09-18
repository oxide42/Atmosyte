class LocationService {
  constructor(settings) {
    this.settings = settings;
    this.locationCache = null;
  }

  truncateCoordinates(lat, lon) {
    return {
      latitude: Math.round(lat * 100) / 100,
      longitude: Math.round(lon * 100) / 100,
    };
  }

  isLocationCacheValid() {
    if (!this.locationCache) return false;

    const cacheAgeMinutes =
      (Date.now() - this.locationCache.timestamp) / (1000 * 60);
    return cacheAgeMinutes < this.settings.settings.locationCacheMinutes;
  }

  async getCurrentPosition() {
    // Check if we have a valid cached location
    if (this.isLocationCacheValid()) {
      return this.locationCache.position;
    }

    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by this browser."));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          // Truncate coordinates to 2 decimals
          const truncated = this.truncateCoordinates(
            position.coords.latitude,
            position.coords.longitude,
          );

          const processedPosition = {
            coords: truncated,
          };

          // Cache the processed position
          this.locationCache = {
            position: processedPosition,
            timestamp: Date.now(),
          };

          resolve(processedPosition);
        },
        (error) => {
          if (error.code === error.POSITION_UNAVAILABLE) {
            // Fallback to Kolding, Denmark coordinates (also truncated)
            const fallbackPosition = {
              coords: this.truncateCoordinates(55.4904, 9.4721),
            };

            // Cache the fallback position
            this.locationCache = {
              position: fallbackPosition,
              timestamp: Date.now(),
            };

            resolve(fallbackPosition);
            return;
          }

          let message;
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = "Location access denied by user";
              break;
            case error.TIMEOUT:
              message = "Location request timed out";
              break;
            default:
              message = "An unknown error occurred while retrieving location";
              break;
          }
          reject(new Error(`Failed to fetch position: ${message}`));
        },
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 300000,
        },
      );
    });
  }

  async getCurrentPlaceName(lat, lon) {
    try {
      // Reverse address lookup with CORS proxy
      const addressUrl = "https://nominatim.openstreetmap.org/reverse";
      const addressParams = {
        lat: lat,
        lon: lon,
        extratags: 0,
        addressdetails: 1,
        format: "json",
      };

      const proxyUrl = "https://corsproxy.io/?";
      const targetUrl = addressUrl + "?" + new URLSearchParams(addressParams);

      const response = await fetch(proxyUrl + encodeURIComponent(targetUrl), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.address) {
        return (
          data.address.city ||
          data.address.municipality ||
          data.address.town ||
          data.address.village ||
          "Unknown location"
        );
      } else {
        return "Unknown location";
      }
    } catch (error) {
      console.error("Error fetching place name:", error);
      return "Unknown location";
    }
  }

  clearCache() {
    this.locationCache = null;
  }
}
