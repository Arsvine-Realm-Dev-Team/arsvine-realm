// @ts-nocheck — R3F JSX elements (group, mesh, etc.) conflict with React 18 JSX types
import React, { Suspense, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Physics, usePlane } from '@react-three/cannon';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import Tesseract from './Tesseract'; // 导入 Tesseract 组件

// 物理碰撞的不可见地面
function Plane(props) {
  const [ref] = usePlane(() => ({
    rotation: [-Math.PI / 2, 0, 0], // 水平旋转
    material: {
      restitution: 0.3, // 弹性
    },
    ...props
  }));
  return (
    <mesh ref={ref} receiveShadow> {/* 接收阴影 */}
      <planeGeometry args={[100, 100]} /> {/* 尺寸 */}
      <meshStandardMaterial color="#050a11" transparent opacity={0} /> {/* 透明 */}
    </mesh>
  );
}

// 场景逻辑处理 (例如更新连接线 + 拖动时让电池 DOM 向 Tesseract 偏移产生"引力")
function SceneLogic({ isConnecting, tesseractRef, batteryPosition3D, setConnectionLinePoints, batteryElementRef, isDragging }) {
  // 跨帧累积偏移量（写在 DOM 上），useFrame 内逐帧 lerp 平滑过渡
  const currentOffsetRef = useRef({ x: 0, y: 0 });

  useFrame(({ camera, size }) => {
    // --- 1) 连接线更新（原有逻辑）---
    if (isConnecting && tesseractRef.current && batteryPosition3D) {
      const tesseractWorldPos = new THREE.Vector3();
      const physicsMesh = tesseractRef.current.meshRef ? tesseractRef.current.meshRef.current : tesseractRef.current;

      if (physicsMesh) {
        physicsMesh.getWorldPosition(tesseractWorldPos);

        const batteryWorldPos = new THREE.Vector3(batteryPosition3D.x, batteryPosition3D.y, 0.5);
        batteryWorldPos.unproject(camera);
        const dir = batteryWorldPos.sub(camera.position).normalize();
        const distance = (batteryPosition3D.z - camera.position.z) / dir.z;
        const finalBatteryWorldPos = camera.position.clone().add(dir.multiplyScalar(distance));

        tesseractWorldPos.clampLength(0, 50);
        finalBatteryWorldPos.clampLength(0, 50);

        setConnectionLinePoints([tesseractWorldPos, finalBatteryWorldPos]);
      }
    }

    // --- 2) 电池"引力"位移：把 Tesseract 的屏幕坐标和电池 DOM 的屏幕坐标做差，按距离缩放偏移 ---
    const batteryEl = batteryElementRef.current;
    if (!batteryEl) return;

    let targetX = 0;
    let targetY = 0;

    if (isDragging && tesseractRef.current) {
      const physicsMesh = tesseractRef.current.meshRef ? tesseractRef.current.meshRef.current : tesseractRef.current;
      if (physicsMesh) {
        // Tesseract 世界坐标 → NDC → Canvas 屏幕像素
        const worldPos = new THREE.Vector3();
        physicsMesh.getWorldPosition(worldPos);
        const projected = worldPos.clone().project(camera);
        const canvasEl = batteryEl.ownerDocument?.defaultView
          ? (batteryEl.ownerDocument.querySelector('canvas') as HTMLCanvasElement | null)
          : null;
        if (!canvasEl) return;
        const canvasRect = canvasEl.getBoundingClientRect();
        const tesseractScreenX = canvasRect.left + ((projected.x + 1) / 2) * canvasRect.width;
        const tesseractScreenY = canvasRect.top + ((1 - projected.y) / 2) * canvasRect.height;

        // 电池图标中心点屏幕坐标（取 batteryIcon 而不是整个 powerDisplay 容器，定位更准）
        const iconEl = batteryEl.querySelector('[class*="batteryIcon"]');
        if (!iconEl) return;
        const iconRect = (iconEl as HTMLElement).getBoundingClientRect();
        // 用 transform 后的实际中心计算到 Tesseract 的方向，
        // 但反推偏移量时要减去已经累计的 transform，得到"原始锚点"上的方向
        const cur = currentOffsetRef.current;
        const iconCenterX = iconRect.left + iconRect.width / 2 - cur.x;
        const iconCenterY = iconRect.top + iconRect.height / 2 - cur.y;

        const dx = tesseractScreenX - iconCenterX;
        const dy = tesseractScreenY - iconCenterY;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        // 引力强度：距离越近吸得越多；最大偏移 14px
        // 用 1 / (1 + dist/120) 平滑曲线：dist=0 → 1.0，dist=120 → 0.5，dist=∞ → 0
        const MAX_OFFSET = 14;
        const strength = 1 / (1 + dist / 120);
        targetX = (dx / dist) * MAX_OFFSET * strength;
        targetY = (dy / dist) * MAX_OFFSET * strength;
      }
    }

    // 帧间 lerp 平滑（系数 0.18 在 60fps 下约 100ms 内贴近目标，松手回弹也走这条路径）
    const cur = currentOffsetRef.current;
    cur.x += (targetX - cur.x) * 0.18;
    cur.y += (targetY - cur.y) * 0.18;

    // 极小偏移直接 snap 到 0，避免无谓的浮点 transform 持续触发合成层
    if (Math.abs(cur.x) < 0.05 && Math.abs(cur.y) < 0.05 && targetX === 0 && targetY === 0) {
      cur.x = 0;
      cur.y = 0;
      batteryEl.style.transform = '';
    } else {
      batteryEl.style.transform = `translate(${cur.x.toFixed(2)}px, ${cur.y.toFixed(2)}px)`;
    }
  });
  return null;
}

// Tesseract 3D 场景主组件
const TesseractExperience = ({
  chargeBattery,
  isActivated,
  isInverted,
  onDraggingChange,
  powerDisplayRef,
  batteryIconRef,
}) => {
  const [batteryPosition3D, setBatteryPosition3D] = useState(null); // 电池 3D NDC 坐标
  const [isConnecting, setIsConnecting] = useState(false); // Tesseract 是否连接到电池
  const tesseractRef = useRef(null); // Tesseract 组件引用
  const [isTesseractDragging, setIsTesseractDragging] = useState(false); // Tesseract 是否被拖拽
  const glRef = useRef(null); // R3F Canvas WebGLRenderer 实例引用
  const batteryElementRef = useRef(null); // 电池容器 DOM，引力位移直接写在它的 style.transform
  const [connectionLinePoints, setConnectionLinePoints] = useState([ // 连接线起点和终点
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, 0),
  ]);

  // 获取电池图标 DOM 位置并转换为 NDC 坐标
  useEffect(() => {
    const batteryElement = powerDisplayRef?.current ?? null;
    batteryElementRef.current = batteryElement;

    if (!batteryElement) {
      console.error('[TesseractExperience] Battery element ref is unavailable.');
      return;
    }

    const updatePosition = () => {
      const canvasElement = glRef.current?.domElement; // Canvas DOM 元素
      const iconElement = batteryIconRef?.current ?? null;

      if (!canvasElement) {
        console.error('[TesseractExperience] Canvas element not found (glRef).');
        setBatteryPosition3D(null);
        return;
      }
      if (!iconElement) {
        console.error('[TesseractExperience] Battery icon ref is unavailable.');
        setBatteryPosition3D(null);
        return;
      }

      const canvasRect = canvasElement.getBoundingClientRect();
      const iconRect = iconElement.getBoundingClientRect(); // 图标边界框

      // 确保矩形尺寸有效
      if (iconRect.width > 0 && iconRect.height > 0 && canvasRect.width > 0 && canvasRect.height > 0) {
        // 计算图标相对于 Canvas 的中心点 (右侧偏移模拟电池正极)
        const relativeX = (iconRect.right + 4) - canvasRect.left;
        const relativeY = (iconRect.top + iconRect.height / 2) - canvasRect.top;

        // Canvas 内相对坐标转换为 NDC (-1 到 1)
        const canvasNdcX = (relativeX / canvasRect.width) * 2 - 1;
        const canvasNdcY = -(relativeY / canvasRect.height) * 2 + 1;
        
        // 设置 3D 位置 (NDC 坐标), z 设为 0.1 确保在相机近平面之前
        const newPosition = { x: canvasNdcX, y: canvasNdcY, z: 0.1 }; 
        setBatteryPosition3D(newPosition); 
      } else {
        console.warn('[TesseractExperience] Invalid rect dimensions, cannot calculate battery position.');
        setBatteryPosition3D(null); 
      }
    };

    // 延迟执行首次位置计算
    const initialTimeoutId = setTimeout(updatePosition, 100);

    window.addEventListener('resize', updatePosition); // 监听窗口大小变化
    
    // 监听内容区域滚动
    const scrollSelector = '[class*="contentWrapper"]'; // 内容滚动容器选择器
    const scrollContainer = document.querySelector(scrollSelector);
    
    if (scrollContainer) {
        scrollContainer.addEventListener('scroll', updatePosition);
    } else {
        // 主页（/）无 .contentWrapper 滚动容器，fallback 到 window 是预期路径
        window.addEventListener('scroll', updatePosition);
    }

    return () => { // 清理
      clearTimeout(initialTimeoutId);
      window.removeEventListener('resize', updatePosition);
       if (scrollContainer) {
          scrollContainer.removeEventListener('scroll', updatePosition);
       } else {
          window.removeEventListener('scroll', updatePosition);
       }
      // 卸载时清空引力位移，避免 transform 残留
      if (batteryElement) {
        batteryElement.style.transform = '';
      }
      batteryElementRef.current = null;
    };
  }, [batteryIconRef, powerDisplayRef]); // 仅在挂载和 ref 可用后运行

  useEffect(() => {
    onDraggingChange?.(isTesseractDragging);
  }, [isTesseractDragging, onDraggingChange]);

  // 更新连接状态回调
  const handleConnectChange = (connecting) => {
    if (connecting !== isConnecting) { // 仅当状态变化时更新
      setIsConnecting(connecting);
    }
  };

  return (
    // 3D Canvas 容器 div
    // 几何与 .leftPanel::after 红色 HUD 边框 (_animations.scss `expandBorder` 终态) 严格对齐：
    //   leftPanel: left: -2vw, width: var(--left-panel-width)=56vw (desktop)
    //   红框:     top: 17.5%, left: 15%, width: 65%, height: 65% (相对 leftPanel)
    //   ⇒ 视口坐标: left = -2vw + 15% × 56vw = 6.4vw
    //              width = 65% × 56vw = 36.4vw
    //              top = 17.5vh, height = 65vh
    // TesseractExperience 仅 desktop 挂载，所以无需响应式
    <div style={{
      position: 'fixed',
      top: '17.5vh',
      left: '6.4vw',
      width: '36.4vw',
      height: '65vh',
      zIndex: 7,
      pointerEvents: 'none',
    }}>
      <Canvas
        shadows // 启用阴影
        camera={{ position: [-3, -1, 8], fov: 50 }} // 相机
        style={{
          background: 'transparent', // 背景透明
          userSelect: 'none', // 禁用文本选择
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none'
        }}
        gl={{ alpha: true }} // WebGL 透明背景
        onCreated={({ gl }) => { // Canvas 创建后
          glRef.current = gl; // 存储 WebGLRenderer
          gl.setClearColor(new THREE.Color(0, 0, 0), 0); // 清除颜色为透明
        }}
      >
        <Suspense fallback={null}> {/* 异步加载占位符 */}
          {/* 灯光 */}
          <ambientLight intensity={0.4} />
          <directionalLight
            position={[5, 10, 5]}
            intensity={1.5}
            castShadow // 平行光投射阴影
            shadow-mapSize-width={1024} // 阴影贴图分辨率
            shadow-mapSize-height={1024}
          />
          <pointLight position={[-5, -5, -5]} intensity={0.5} color="red" />
          <pointLight position={[0, 5, -10]} intensity={0.8} color="blue" />

          {/* 激活时渲染物理世界和 Tesseract */}
          {isActivated && (
            <Physics gravity={[0, -9.82, 0]}> {/* 物理世界及重力 */}
              <Plane position={[0, -3, 0]} /> {/* 地面 */} 
              {batteryPosition3D ? ( // 电池位置计算完成后渲染 Tesseract
                <Tesseract
                  ref={tesseractRef}
                  position={[0, 1, 0]} // Tesseract 初始位置 (Y 轴会被物理引擎覆盖)
                  batteryPosition3D={batteryPosition3D}
                  onConnectChange={handleConnectChange}
                  chargeBattery={chargeBattery}
                  onDraggingChange={setIsTesseractDragging} // 拖拽状态回调
                  isInverted={isInverted} // 反色状态
                />
              ) : (
                 null // 电池位置未就绪则不渲染 Tesseract
              )}
              {/* Physics debug view can be enabled by importing Debug from @react-three/cannon */}
            </Physics>
          )}
          {/* 激活且连接时渲染连接线 */}
          {isActivated && isConnecting && (
            <Line
              points={connectionLinePoints} // 连接线端点
              color="#888888" // 线条颜色
              lineWidth={2} // 线条宽度
              dashed={false}
            />
          )}
          {/* 场景逻辑辅助组件 */}
          {isActivated && (
             <SceneLogic
                isConnecting={isConnecting}
                tesseractRef={tesseractRef}
                batteryPosition3D={batteryPosition3D}
                setConnectionLinePoints={setConnectionLinePoints}
                batteryElementRef={batteryElementRef}
                isDragging={isTesseractDragging}
             />
          )}
        </Suspense>
      </Canvas>
    </div>
  );
};

export default TesseractExperience; 
