import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import MapView, { Polyline, Marker, Callout } from 'react-native-maps';
import { Colors } from '../constants/colors';

type CheckpointData = {
  lat: number;
  lng: number;
  tags: string[];
  comment?: string;
  photoUri?: string;
};

type MapWrapperProps = {
  points?: { lat: number; lng: number }[];
  checkpoints?: CheckpointData[];
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  style?: any;
  showsUserLocation?: boolean;
  followsUserLocation?: boolean;
  children?: React.ReactNode;
};

const DEFAULT_REGION = {
  latitude: 35.6595,
  longitude: 139.7004,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

export default function MapWrapper({
  points = [],
  checkpoints = [],
  initialRegion,
  style,
  showsUserLocation = true,
  followsUserLocation = false,
  children,
}: MapWrapperProps) {
  const region = initialRegion || (points.length > 0
    ? {
        latitude: points[points.length - 1].lat,
        longitude: points[points.length - 1].lng,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }
    : DEFAULT_REGION);

  const coords = points.map((p) => ({
    latitude: p.lat,
    longitude: p.lng,
  }));

  return (
    <MapView
      style={[styles.map, style]}
      initialRegion={region}
      showsUserLocation={showsUserLocation}
      followsUserLocation={followsUserLocation}
      showsMyLocationButton={false}
    >
      {coords.length > 1 && (
        <Polyline
          coordinates={coords}
          strokeColor={Colors.accent}
          strokeWidth={4}
        />
      )}
      {checkpoints.map((cp, i) => (
        <Marker
          key={i}
          coordinate={{ latitude: cp.lat, longitude: cp.lng }}
        >
          {/* カスタムCallout：写真サムネ＋コメント */}
          <Callout tooltip style={styles.calloutContainer}>
            <View style={styles.callout}>
              {cp.photoUri ? (
                <Image source={{ uri: cp.photoUri }} style={styles.calloutPhoto} />
              ) : null}
              <View style={styles.calloutBody}>
                {cp.tags.length > 0 && (
                  <Text style={styles.calloutTags}>{cp.tags.join(' ')}</Text>
                )}
                {cp.comment ? (
                  <Text style={styles.calloutComment} numberOfLines={3}>
                    {cp.comment}
                  </Text>
                ) : (
                  !cp.tags.length && (
                    <Text style={styles.calloutComment}>📍 スポット</Text>
                  )
                )}
              </View>
            </View>
            <View style={styles.calloutArrow} />
          </Callout>
        </Marker>
      ))}
      {children}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
  calloutContainer: {
    width: 200,
  },
  callout: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  calloutPhoto: {
    width: 200,
    height: 120,
  },
  calloutBody: {
    padding: 10,
    gap: 4,
  },
  calloutTags: {
    fontSize: 16,
  },
  calloutComment: {
    fontSize: 13,
    color: Colors.textMid,
    lineHeight: 18,
  },
  calloutArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#fff',
    alignSelf: 'center',
  },
});
