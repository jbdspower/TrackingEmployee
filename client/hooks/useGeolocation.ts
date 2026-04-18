import { useState, useEffect, useCallback } from "react";

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  error: string | null;
  loading: boolean;
}

interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  maximumAge?: number;
  timeout?: number;
  watchPosition?: boolean;
}

export const useGeolocation = (options: GeolocationOptions = {}) => {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    error: null,
    loading: true,
  });

  const {
    enableHighAccuracy = false, // 🔥 FIX: Reduce GPS accuracy for better performance
    maximumAge = 60000, // 🔥 FIX: Cache location for 1 minute to reduce CPU load
    timeout = 15000, // 🔥 FIX: Increase timeout to reduce failures
    watchPosition = false,
  } = options;

  const updatePosition = useCallback((position: GeolocationPosition) => {
    setState({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      error: null,
      loading: false,
    });
    return position;
  }, []);

  const handleError = useCallback((error: GeolocationPositionError) => {
    let errorMessage = "An unknown error occurred";

    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = "Location access denied by user";
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = "Location information unavailable";
        break;
      case error.TIMEOUT:
        errorMessage = "Location request timed out";
        break;
    }

    setState((prev) => ({
      ...prev,
      error: errorMessage,
      loading: false,
    }));
    return null;
  }, []);

  const getCurrentPosition = useCallback(() => {
    return new Promise<GeolocationPosition | null>((resolve) => {
      if (!navigator.geolocation) {
        setState((prev) => ({
          ...prev,
          error: "Geolocation is not supported by this browser",
          loading: false,
        }));
        resolve(null);
        return;
      }

      setState((prev) => ({ ...prev, loading: true, error: null }));

      navigator.geolocation.getCurrentPosition(
        (position) => resolve(updatePosition(position)),
        (error) => resolve(handleError(error)),
        {
          enableHighAccuracy,
          maximumAge,
          timeout,
        }
      );
    });
  }, [enableHighAccuracy, maximumAge, timeout, updatePosition, handleError]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        error: "Geolocation is not supported by this browser",
        loading: false,
      }));
      return;
    }

    let watchId: number | null = null;

    if (watchPosition) {
      watchId = navigator.geolocation.watchPosition(
        updatePosition,
        handleError,
        {
          enableHighAccuracy,
          maximumAge,
          timeout,
        },
      );
    } else {
      getCurrentPosition();
    }

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [
    watchPosition,
    getCurrentPosition,
    updatePosition,
    handleError,
    enableHighAccuracy,
    maximumAge,
    timeout,
  ]);

  return {
    ...state,
    getCurrentPosition,
  };
};
