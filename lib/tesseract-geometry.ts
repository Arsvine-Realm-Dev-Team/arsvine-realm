import * as THREE from 'three';

export interface BatteryPosition3D {
  x: number;
  y: number;
  z: number;
}

export interface Point2D {
  x: number;
  y: number;
}

export function resolveBatteryAnchorPosition(
  canvasRect: DOMRect,
  iconRect: DOMRect,
): BatteryPosition3D | null {
  if (
    canvasRect.width <= 0
    || canvasRect.height <= 0
    || iconRect.width <= 0
    || iconRect.height <= 0
  ) {
    return null;
  }

  const relativeX = (iconRect.right + 4) - canvasRect.left;
  const relativeY = (iconRect.top + iconRect.height / 2) - canvasRect.top;

  return {
    x: (relativeX / canvasRect.width) * 2 - 1,
    y: -(relativeY / canvasRect.height) * 2 + 1,
    z: 0.1,
  };
}

export function projectWorldPositionToCanvas(
  worldPosition: THREE.Vector3,
  camera: THREE.Camera,
  canvasRect: DOMRect,
): Point2D {
  const projected = worldPosition.clone().project(camera);
  return {
    x: canvasRect.left + ((projected.x + 1) / 2) * canvasRect.width,
    y: canvasRect.top + ((1 - projected.y) / 2) * canvasRect.height,
  };
}

export function resolveBatteryWorldPosition(
  batteryPosition3D: BatteryPosition3D,
  camera: THREE.Camera,
) {
  const batteryWorldPos = new THREE.Vector3(
    batteryPosition3D.x,
    batteryPosition3D.y,
    0.5,
  );
  batteryWorldPos.unproject(camera);
  const direction = batteryWorldPos.sub(camera.position).normalize();
  const distance = (batteryPosition3D.z - camera.position.z) / direction.z;
  return camera.position.clone().add(direction.multiplyScalar(distance));
}

export function computeBatteryAttractionOffset({
  tesseractScreen,
  iconRect,
  currentOffset,
  maxOffset = 14,
}: {
  tesseractScreen: Point2D;
  iconRect: DOMRect;
  currentOffset: Point2D;
  maxOffset?: number;
}) {
  const iconCenterX = iconRect.left + iconRect.width / 2 - currentOffset.x;
  const iconCenterY = iconRect.top + iconRect.height / 2 - currentOffset.y;
  const deltaX = tesseractScreen.x - iconCenterX;
  const deltaY = tesseractScreen.y - iconCenterY;
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY) || 1;
  const strength = 1 / (1 + distance / 120);

  return {
    x: (deltaX / distance) * maxOffset * strength,
    y: (deltaY / distance) * maxOffset * strength,
  };
}
