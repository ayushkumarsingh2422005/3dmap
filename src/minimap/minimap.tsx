import React, {useMemo, useState, useCallback} from 'react';
import {Map, MapMouseEvent, useMap, useMapsLibrary} from '@vis.gl/react-google-maps';

import {useDebouncedEffect} from '../utility-hooks';
import {estimateCameraPosition} from './estimate-camera-position';
import {CameraPositionMarker} from './camera-position-marker';
import {ViewCenterMarker} from './view-center-marker';

import type {Map3DCameraProps} from '../map-3d';
import './minimap.css';

type MiniMapProps = {
  camera3dProps: Map3DCameraProps;
  onMapClick?: (ev: MapMouseEvent) => void;
  onMarkerDragEnd?: (position: google.maps.LatLngAltitudeLiteral) => void;
};

export const MiniMap = ({camera3dProps, onMapClick, onMarkerDragEnd}: MiniMapProps) => {
  const minimap = useMap('minimap');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchBox, setSearchBox] = useState<google.maps.places.SearchBox | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);

  // Load Places library
  useMapsLibrary('places');

  const cameraPosition = useMemo(
    () => estimateCameraPosition(camera3dProps),
    [camera3dProps]
  );

  // Initialize search box
  React.useEffect(() => {
    if (!minimap) return;

    const input = document.getElementById('minimap-search') as HTMLInputElement;
    if (!input) return;

    const searchBoxInstance = new google.maps.places.SearchBox(input);
    setSearchBox(searchBoxInstance);

    // Listen for places changes
    searchBoxInstance.addListener('places_changed', () => {
      const places = searchBoxInstance.getPlaces();
      if (!places || places.length === 0) return;

      // Clear previous markers
      markers.forEach(marker => marker.setMap(null));
      const newMarkers: google.maps.Marker[] = [];

      // Add markers for each place
      places.forEach(place => {
        if (!place.geometry || !place.geometry.location) return;

        const marker = new google.maps.Marker({
          map: minimap,
          position: place.geometry.location,
          title: place.name
        });

        newMarkers.push(marker);

        // If this is the first place, center the map on it
        if (place === places[0]) {
          minimap.setCenter(place.geometry.location);
          minimap.setZoom(15);
        }
      });

      setMarkers(newMarkers);
    });

    return () => {
      markers.forEach(marker => marker.setMap(null));
    };
  }, [minimap]);

  const handleSearch = useCallback(() => {
    if (!searchBox) return;
    setIsSearching(true);
    searchBox.search(searchQuery);
    setIsSearching(false);
  }, [searchBox, searchQuery]);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSearch();
      }
    },
    [handleSearch]
  );

  useDebouncedEffect(
    () => {
      if (!minimap) return;

      const bounds = new google.maps.LatLngBounds();
      bounds.extend(camera3dProps.center);
      bounds.extend(cameraPosition);

      const maxZoom = Math.max(
        1,
        Math.round(24 - Math.log2(camera3dProps.range))
      );

      minimap.fitBounds(bounds, 120);
      minimap.setZoom(maxZoom);
    },
    200,
    [minimap, camera3dProps.center, camera3dProps.range, cameraPosition]
  );

  return (
    <div className="minimap-container">
      <div className="minimap-search-container">
        <input
          id="minimap-search"
          type="text"
          placeholder="Search for a location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          className="minimap-search-input"
        />
        <button
          onClick={handleSearch}
          disabled={isSearching}
          className="minimap-search-button">
          {isSearching ? 'Searching...' : 'Search'}
        </button>
      </div>
      <Map
        id={'minimap'}
        className={'minimap'}
        mapId={'bf51a910020fa25a'}
        defaultCenter={camera3dProps.center}
        defaultZoom={10}
        onClick={onMapClick}
        disableDefaultUI
        clickableIcons={false}>
        <ViewCenterMarker 
          position={camera3dProps.center}
          onDragEnd={onMarkerDragEnd}
        />
        <CameraPositionMarker
          position={cameraPosition}
          heading={camera3dProps.heading}
        />
      </Map>
    </div>
  );
};
