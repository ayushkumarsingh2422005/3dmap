import React, {useCallback} from 'react';
import {AdvancedMarker, MapMouseEvent} from '@vis.gl/react-google-maps';

import './view-center-marker.css';

type ViewCenterMarkerProps = {
  position: google.maps.LatLngAltitudeLiteral;
  onDragEnd?: (position: google.maps.LatLngAltitudeLiteral) => void;
};

export const ViewCenterMarker = ({position, onDragEnd}: ViewCenterMarkerProps) => {
  const handleDragEnd = useCallback(
    (e: MapMouseEvent) => {
      if (!e.detail.latLng || !onDragEnd) return;
      onDragEnd({
        lat: e.detail.latLng.lat,
        lng: e.detail.latLng.lng,
        altitude: 0 // Set altitude to 0 for dragging
      });
    },
    [onDragEnd]
  );

  // Create a position object without altitude for the marker
  const markerPosition = {
    lat: position.lat,
    lng: position.lng
  };

  return (
    <AdvancedMarker
      position={markerPosition}
      className={'view-center-marker'}
      draggable={true}
      onDragEnd={handleDragEnd}>
      <div className={'circle'} />
    </AdvancedMarker>
  );
};
