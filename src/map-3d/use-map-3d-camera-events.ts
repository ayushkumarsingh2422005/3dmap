import {useEffect, useRef} from 'react';
import {Map3DCameraProps} from './map-3d';

const cameraPropNames = ['center', 'range', 'heading', 'tilt', 'roll'] as const;

const DEFAULT_CAMERA_PROPS: Map3DCameraProps = {
  center: {lat: 0, lng: 0, altitude: 0},
  range: 0,
  heading: 0,
  tilt: 0,
  roll: 0
};

const INITIAL_VIEW_PROPS = {
  center: {lat: 37.72809, lng: -119.64473, altitude: 1300},
  range: 5000,
  heading: 61,
  tilt: 69,
  roll: 0
};

/**
 * Binds event-listeners for all camera-related events to the Map3dElement.
 * The values from the events are aggregated into a Map3DCameraProps object,
 * and changes are dispatched via the onCameraChange callback.
 */
export function useMap3DCameraEvents(
  mapEl?: google.maps.maps3d.Map3DElement | null,
  onCameraChange?: (cameraProps: Map3DCameraProps) => void
) {
  const cameraPropsRef = useRef<Map3DCameraProps>(DEFAULT_CAMERA_PROPS);
  const isDragging = useRef(false);
  const lastMousePos = useRef({x: 0, y: 0});

  useEffect(() => {
    if (!mapEl) return;

    const cleanupFns: (() => void)[] = [];

    let updateQueued = false;

    // Handle mouse wheel zoom
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
      const newRange = cameraPropsRef.current.range * zoomFactor;
      mapEl.range = newRange;
    };

    // Handle mouse drag rotation
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) { // Left click
        isDragging.current = true;
        lastMousePos.current = {x: e.clientX, y: e.clientY};
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;

      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;

      if (e.buttons === 1) { // Left click drag
        mapEl.heading += dx * 0.5;
        mapEl.tilt = Math.max(0, Math.min(90, mapEl.tilt - dy * 0.5));
      } else if (e.buttons === 2) { // Right click drag
        mapEl.tilt = Math.max(0, Math.min(90, mapEl.tilt - dy * 0.5));
        mapEl.roll += dx * 0.5;
      }

      lastMousePos.current = {x: e.clientX, y: e.clientY};
    };

    const handleMouseUp = () => {
      isDragging.current = false;
    };

    // Handle double click reset
    const handleDoubleClick = () => {
      Object.assign(mapEl, INITIAL_VIEW_PROPS);
    };

    // Prevent context menu on right click
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // Add mouse event listeners
    mapEl.addEventListener('wheel', handleWheel);
    mapEl.addEventListener('mousedown', handleMouseDown);
    mapEl.addEventListener('mousemove', handleMouseMove);
    mapEl.addEventListener('mouseup', handleMouseUp);
    mapEl.addEventListener('dblclick', handleDoubleClick);
    mapEl.addEventListener('contextmenu', handleContextMenu);

    cleanupFns.push(
      () => mapEl.removeEventListener('wheel', handleWheel),
      () => mapEl.removeEventListener('mousedown', handleMouseDown),
      () => mapEl.removeEventListener('mousemove', handleMouseMove),
      () => mapEl.removeEventListener('mouseup', handleMouseUp),
      () => mapEl.removeEventListener('dblclick', handleDoubleClick),
      () => mapEl.removeEventListener('contextmenu', handleContextMenu)
    );

    for (const p of cameraPropNames) {
      const removeListener = addDomListener(mapEl, `gmp-${p}change`, () => {
        const newValue = mapEl[p];

        if (newValue == null) return;

        if (p === 'center')
          // fixme: the typings say this should be a LatLngAltitudeLiteral, but in reality a
          //  LatLngAltitude object is returned, even when a LatLngAltitudeLiteral was written
          //  to the property.
          cameraPropsRef.current.center = (
            newValue as google.maps.LatLngAltitude
          ).toJSON();
        else cameraPropsRef.current[p] = newValue as number;

        if (onCameraChange && !updateQueued) {
          updateQueued = true;

          // queue a microtask so all synchronously dispatched events are handled first
          queueMicrotask(() => {
            updateQueued = false;
            onCameraChange(cameraPropsRef.current);
          });
        }
      });

      cleanupFns.push(removeListener);
    }

    return () => {
      for (const removeListener of cleanupFns) removeListener();
    };
  }, [mapEl, onCameraChange]);
}

/**
 * Adds an event-listener and returns a function to remove it again.
 */
function addDomListener(
  element: google.maps.maps3d.Map3DElement,
  type: string,
  listener: (this: google.maps.maps3d.Map3DElement, ev: unknown) => void
): () => void {
  element.addEventListener(type, listener);

  return () => {
    element.removeEventListener(type, listener);
  };
}
