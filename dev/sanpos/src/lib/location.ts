import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { appendRecordingPoints } from './storage';
import { WalkPoint } from '../types';

export const BACKGROUND_LOCATION_TASK = 'sanpos-background-location';

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('Background location error:', error);
    return;
  }
  const { locations } = data as { locations: Location.LocationObject[] };
  if (locations && locations.length > 0) {
    const points: WalkPoint[] = locations.map((loc) => ({
      lat: loc.coords.latitude,
      lng: loc.coords.longitude,
      timestamp: loc.timestamp,
    }));
    appendRecordingPoints(points);
  }
});

let foregroundSub: Location.LocationSubscription | null = null;

export async function startLocationTracking(): Promise<void> {
  const { status: fg } = await Location.requestForegroundPermissionsAsync();
  if (fg !== 'granted') {
    throw new Error('位置情報の許可が必要です');
  }

  let bgGranted = false;
  try {
    const { status: bg } = await Location.requestBackgroundPermissionsAsync();
    bgGranted = bg === 'granted';
  } catch {
    console.warn('Background permission not available');
  }

  if (bgGranted) {
    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.High,
      timeInterval: 2000,
      distanceInterval: 5,
      foregroundService: {
        notificationTitle: 'sanpos 記録中',
        notificationBody: '散歩を記録しています...',
        notificationColor: '#c4786a',
      },
      pausesUpdatesAutomatically: false,
    });
  } else {
    foregroundSub = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 2000,
        distanceInterval: 5,
      },
      (loc) => {
        const point: WalkPoint = {
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
          timestamp: loc.timestamp,
        };
        appendRecordingPoints([point]);
      }
    );
  }
}

export async function stopLocationTracking(): Promise<void> {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
  if (isRegistered) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  }
  if (foregroundSub) {
    foregroundSub.remove();
    foregroundSub = null;
  }
}

export async function getCurrentLocation(): Promise<{ lat: number; lng: number } | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const loc = await Location.getLastKnownPositionAsync();
    if (loc) {
      return { lat: loc.coords.latitude, lng: loc.coords.longitude };
    }
    const fresh = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 5000,
    });
    return { lat: fresh.coords.latitude, lng: fresh.coords.longitude };
  } catch (e) {
    console.error('getCurrentLocation error:', e);
    return null;
  }
}
