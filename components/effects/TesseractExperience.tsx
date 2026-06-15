import React, { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { Physics, usePlane } from '@react-three/cannon';
import * as THREE from 'three';

import Tesseract, { type TesseractHandle } from './Tesseract';
import {
  computeBatteryAttractionOffset,
  projectWorldPositionToCanvas,
  resolveBatteryAnchorPosition,
  resolveBatteryWorldPosition,
  type BatteryPosition3D,
} from '../../lib/tesseract-geometry';

function resolvePhysicsMesh(tesseractRef: React.RefObject<TesseractHandle | null>) {
  return tesseractRef.current?.meshRef.current ?? null;
}

function Plane(props: { position: [number, number, number] }) {
  const [ref] = usePlane<THREE.Mesh>(() => ({
    rotation: [-Math.PI / 2, 0, 0],
    material: {
      restitution: 0.3,
    },
    ...props,
  }));

  return (
    <mesh ref={ref} receiveShadow>
      <planeGeometry args={[100, 100]} />
      <meshStandardMaterial color="#050a11" transparent opacity={0} />
    </mesh>
  );
}

interface SceneLogicProps {
  isConnecting: boolean;
  tesseractRef: React.RefObject<TesseractHandle | null>;
  batteryPosition3D: BatteryPosition3D | null;
  setConnectionLinePoints: React.Dispatch<React.SetStateAction<[THREE.Vector3, THREE.Vector3]>>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  batteryElementRef: React.RefObject<HTMLDivElement | null>;
  batteryIconElementRef: React.RefObject<HTMLDivElement | null>;
  isDragging: boolean;
}

function SceneLogic({
  isConnecting,
  tesseractRef,
  batteryPosition3D,
  setConnectionLinePoints,
  canvasRef,
  batteryElementRef,
  batteryIconElementRef,
  isDragging,
}: SceneLogicProps) {
  const currentOffsetRef = useRef({ x: 0, y: 0 });

  useFrame(({ camera }) => {
    if (isConnecting && batteryPosition3D) {
      const physicsMesh = resolvePhysicsMesh(tesseractRef);
      if (physicsMesh) {
        const tesseractWorldPos = new THREE.Vector3();
        physicsMesh.getWorldPosition(tesseractWorldPos);
        const batteryWorldPos = resolveBatteryWorldPosition(batteryPosition3D, camera);

        tesseractWorldPos.clampLength(0, 50);
        batteryWorldPos.clampLength(0, 50);

        setConnectionLinePoints([tesseractWorldPos, batteryWorldPos]);
      }
    }

    const batteryEl = batteryElementRef.current;
    const canvasElement = canvasRef.current;
    const iconElement = batteryIconElementRef.current;
    if (!batteryEl || !canvasElement || !iconElement) {
      return;
    }

    let targetX = 0;
    let targetY = 0;

    if (isDragging) {
      const physicsMesh = resolvePhysicsMesh(tesseractRef);
      if (physicsMesh) {
        const worldPosition = new THREE.Vector3();
        physicsMesh.getWorldPosition(worldPosition);
        const canvasRect = canvasElement.getBoundingClientRect();
        const tesseractScreen = projectWorldPositionToCanvas(worldPosition, camera, canvasRect);
        const offset = computeBatteryAttractionOffset({
          tesseractScreen,
          iconRect: iconElement.getBoundingClientRect(),
          currentOffset: currentOffsetRef.current,
        });
        targetX = offset.x;
        targetY = offset.y;
      }
    }

    const currentOffset = currentOffsetRef.current;
    currentOffset.x += (targetX - currentOffset.x) * 0.18;
    currentOffset.y += (targetY - currentOffset.y) * 0.18;

    if (
      Math.abs(currentOffset.x) < 0.05
      && Math.abs(currentOffset.y) < 0.05
      && targetX === 0
      && targetY === 0
    ) {
      currentOffset.x = 0;
      currentOffset.y = 0;
      batteryEl.style.transform = '';
    } else {
      batteryEl.style.transform = `translate(${currentOffset.x.toFixed(2)}px, ${currentOffset.y.toFixed(2)}px)`;
    }
  });

  return null;
}

interface TesseractExperienceProps {
  chargeBattery: () => void;
  isActivated: boolean;
  isInverted: boolean;
  onDraggingChange?: (dragging: boolean) => void;
  powerDisplayRef: React.RefObject<HTMLDivElement | null>;
  batteryIconRef: React.RefObject<HTMLDivElement | null>;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
}

const TesseractExperience = ({
  chargeBattery,
  isActivated,
  isInverted,
  onDraggingChange,
  powerDisplayRef,
  batteryIconRef,
  scrollContainerRef,
}: TesseractExperienceProps) => {
  const [batteryPosition3D, setBatteryPosition3D] = useState<BatteryPosition3D | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const tesseractRef = useRef<TesseractHandle | null>(null);
  const [isTesseractDragging, setIsTesseractDragging] = useState(false);
  const glRef = useRef<THREE.WebGLRenderer | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const batteryElementRef = useRef<HTMLDivElement | null>(null);
  const [connectionLinePoints, setConnectionLinePoints] = useState<[THREE.Vector3, THREE.Vector3]>([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, 0),
  ]);

  useEffect(() => {
    batteryElementRef.current = powerDisplayRef.current ?? null;
  }, [powerDisplayRef]);

  useEffect(() => {
    const batteryElement = powerDisplayRef.current ?? null;
    batteryElementRef.current = batteryElement;

    const updatePosition = () => {
      const canvasElement = glRef.current?.domElement ?? null;
      const iconElement = batteryIconRef.current ?? null;

      canvasRef.current = canvasElement;

      if (!canvasElement || !iconElement) {
        setBatteryPosition3D(null);
        return;
      }

      const nextPosition = resolveBatteryAnchorPosition(
        canvasElement.getBoundingClientRect(),
        iconElement.getBoundingClientRect(),
      );
      setBatteryPosition3D(nextPosition);
    };

    const initialTimeoutId = window.setTimeout(updatePosition, 100);
    window.addEventListener('resize', updatePosition);
    const activeScrollContainer = scrollContainerRef.current;

    if (activeScrollContainer) {
      activeScrollContainer.addEventListener('scroll', updatePosition, { passive: true });
    } else {
      window.addEventListener('scroll', updatePosition, { passive: true });
    }

    return () => {
      window.clearTimeout(initialTimeoutId);
      window.removeEventListener('resize', updatePosition);
      if (activeScrollContainer) {
        activeScrollContainer.removeEventListener('scroll', updatePosition);
      } else {
        window.removeEventListener('scroll', updatePosition);
      }
      if (batteryElement) {
        batteryElement.style.transform = '';
      }
      batteryElementRef.current = null;
    };
  }, [batteryIconRef, powerDisplayRef, scrollContainerRef]);

  useEffect(() => {
    onDraggingChange?.(isTesseractDragging);
  }, [isTesseractDragging, onDraggingChange]);

  return (
    <div
      style={{
        position: 'fixed',
        top: '17.5vh',
        left: '6.4vw',
        width: '36.4vw',
        height: '65vh',
        zIndex: 7,
        pointerEvents: 'none',
      }}
    >
      <Canvas
        shadows
        camera={{ position: [-3, -1, 8], fov: 50 }}
        style={{
          background: 'transparent',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none',
        }}
        gl={{ alpha: true }}
        onCreated={({ gl }) => {
          glRef.current = gl;
          canvasRef.current = gl.domElement;
          gl.setClearColor(new THREE.Color(0, 0, 0), 0);
        }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.4} />
          <directionalLight
            position={[5, 10, 5]}
            intensity={1.5}
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
          />
          <pointLight position={[-5, -5, -5]} intensity={0.5} color="red" />
          <pointLight position={[0, 5, -10]} intensity={0.8} color="blue" />

          {isActivated && (
            <Physics gravity={[0, -9.82, 0]}>
              <Plane position={[0, -3, 0]} />
              {batteryPosition3D ? (
                <Tesseract
                  ref={tesseractRef}
                  position={[0, 1, 0]}
                  batteryPosition3D={batteryPosition3D}
                  onConnectChange={setIsConnecting}
                  chargeBattery={chargeBattery}
                  onDraggingChange={setIsTesseractDragging}
                  isInverted={isInverted}
                />
              ) : null}
            </Physics>
          )}

          {isActivated && isConnecting && (
            <Line
              points={connectionLinePoints}
              color="#888888"
              lineWidth={2}
              dashed={false}
            />
          )}

          {isActivated && (
            <SceneLogic
              isConnecting={isConnecting}
              tesseractRef={tesseractRef}
              batteryPosition3D={batteryPosition3D}
              setConnectionLinePoints={setConnectionLinePoints}
              canvasRef={canvasRef}
              batteryElementRef={batteryElementRef}
              batteryIconElementRef={batteryIconRef}
              isDragging={isTesseractDragging}
            />
          )}
        </Suspense>
      </Canvas>
    </div>
  );
};

export default TesseractExperience;
