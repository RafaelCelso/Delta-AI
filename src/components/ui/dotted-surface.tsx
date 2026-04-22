"use client";

import { cn } from "@/lib/utils";
import React, { useEffect, useRef, useState } from "react";
import type * as THREE from "three";

type DottedSurfaceProps = Omit<React.ComponentProps<"div">, "ref">;

type SceneState = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  particles: THREE.Points[];
  animationId: number;
  count: number;
};

export function DottedSurface({ className, ...props }: DottedSurfaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SceneState | null>(null);
  const [webGLReady, setWebGLReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    // Quick WebGL support check
    try {
      const testCanvas = document.createElement("canvas");
      const gl =
        testCanvas.getContext("webgl2") ||
        testCanvas.getContext("webgl") ||
        testCanvas.getContext("experimental-webgl");
      if (!gl) return;
    } catch {
      return;
    }

    let cancelled = false;

    import("three")
      .then((THREE) => {
        if (cancelled || !containerRef.current) return;

        const SEPARATION = 150;
        const AMOUNTX = 40;
        const AMOUNTY = 60;

        const scene = new THREE.Scene();
        scene.fog = new THREE.Fog(0xffffff, 2000, 10000);

        const camera = new THREE.PerspectiveCamera(
          60,
          window.innerWidth / window.innerHeight,
          1,
          10000,
        );
        camera.position.set(0, 355, 1220);

        let renderer: THREE.WebGLRenderer;
        try {
          renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true,
          });
        } catch {
          return;
        }

        // Check if the context was actually created
        if (!renderer.getContext()) return;

        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setClearColor(scene.fog.color, 0);

        containerRef.current.appendChild(renderer.domElement);

        const positions: number[] = [];
        const colors: number[] = [];
        const geometry = new THREE.BufferGeometry();

        for (let ix = 0; ix < AMOUNTX; ix++) {
          for (let iy = 0; iy < AMOUNTY; iy++) {
            const x = ix * SEPARATION - (AMOUNTX * SEPARATION) / 2;
            const y = 0;
            const z = iy * SEPARATION - (AMOUNTY * SEPARATION) / 2;

            positions.push(x, y, z);

            // Always white dots
            colors.push(255, 255, 255);
          }
        }

        geometry.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(positions, 3),
        );
        geometry.setAttribute(
          "color",
          new THREE.Float32BufferAttribute(colors, 3),
        );

        const material = new THREE.PointsMaterial({
          size: 8,
          vertexColors: true,
          transparent: true,
          opacity: 1,
          sizeAttenuation: true,
        });

        const points = new THREE.Points(geometry, material);
        scene.add(points);

        let count = 0;
        let animationId = 0;

        const animate = () => {
          animationId = requestAnimationFrame(animate);

          const positionAttribute = geometry.attributes.position;
          const posArray = positionAttribute.array as Float32Array;

          let i = 0;
          for (let ix = 0; ix < AMOUNTX; ix++) {
            for (let iy = 0; iy < AMOUNTY; iy++) {
              const index = i * 3;
              posArray[index + 1] =
                Math.sin((ix + count) * 0.3) * 50 +
                Math.sin((iy + count) * 0.5) * 50;
              i++;
            }
          }

          positionAttribute.needsUpdate = true;
          renderer.render(scene, camera);
          count += 0.03;
        };

        const handleResize = () => {
          camera.aspect = window.innerWidth / window.innerHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(window.innerWidth, window.innerHeight);
        };

        window.addEventListener("resize", handleResize);
        animate();

        sceneRef.current = {
          scene,
          camera,
          renderer,
          particles: [points],
          animationId,
          count,
        };

        // WebGL is working — hide the CSS fallback
        setWebGLReady(true);
      })
      .catch(() => {
        // Import or init failed — fallback stays visible
      });

    return () => {
      cancelled = true;

      if (sceneRef.current) {
        cancelAnimationFrame(sceneRef.current.animationId);

        sceneRef.current.scene.traverse((object) => {
          if ((object as THREE.Points).isPoints) {
            (object as THREE.Points).geometry.dispose();
            const mat = (object as THREE.Points).material;
            if (Array.isArray(mat)) {
              mat.forEach((m) => m.dispose());
            } else {
              mat.dispose();
            }
          }
        });

        sceneRef.current.renderer.dispose();

        if (containerRef.current && sceneRef.current.renderer.domElement) {
          containerRef.current.removeChild(
            sceneRef.current.renderer.domElement,
          );
        }

        sceneRef.current = null;
      }
    };
  }, []);

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-0 overflow-hidden",
        className,
      )}
      {...props}
    >
      {/* Emerald glow blobs behind everything */}
      <div
        className="absolute -left-[10%] top-[10%] h-[500px] w-[600px] rounded-full opacity-25 blur-[120px]"
        style={{
          background: "radial-gradient(circle, #10b981, transparent 70%)",
          animation: "emeraldFloat1 14s ease-in-out infinite alternate",
        }}
      />
      <div
        className="absolute -right-[5%] top-[40%] h-[400px] w-[500px] rounded-full opacity-20 blur-[100px]"
        style={{
          background: "radial-gradient(circle, #059669, transparent 70%)",
          animation: "emeraldFloat2 18s ease-in-out infinite alternate",
        }}
      />
      <div
        className="absolute bottom-[5%] left-[25%] h-[450px] w-[550px] rounded-full opacity-15 blur-[110px]"
        style={{
          background: "radial-gradient(circle, #34d399, transparent 70%)",
          animation: "emeraldFloat3 16s ease-in-out infinite alternate",
        }}
      />
      <style>{`
        @keyframes emeraldFloat1 {
          0% { transform: translate(0, 0) scale(1); }
          100% { transform: translate(60px, 40px) scale(1.1); }
        }
        @keyframes emeraldFloat2 {
          0% { transform: translate(0, 0) scale(1); }
          100% { transform: translate(-50px, -30px) scale(1.05); }
        }
        @keyframes emeraldFloat3 {
          0% { transform: translate(0, 0) scale(1); }
          100% { transform: translate(40px, -40px) scale(1.08); }
        }
      `}</style>

      {/* CSS fallback — always rendered, hidden when WebGL takes over */}
      {!webGLReady && (
        <>
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(255,255,255,0.5) 1.5px, transparent 1.5px)",
              backgroundSize: "28px 28px",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 60% 40% at 30% 50%, rgba(16,185,129,0.25), transparent)",
              animation:
                "dottedFallbackWave1 20s ease-in-out infinite alternate",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 50% 35% at 70% 60%, rgba(52,211,153,0.20), transparent)",
              animation:
                "dottedFallbackWave2 25s ease-in-out infinite alternate",
            }}
          />
          <style>{`
            @keyframes dottedFallbackWave1 {
              0% { transform: translateY(0) scale(1); }
              100% { transform: translateY(-40px) scale(1.05); }
            }
            @keyframes dottedFallbackWave2 {
              0% { transform: translateY(0) scale(1); }
              100% { transform: translateY(30px) scale(0.95); }
            }
          `}</style>
        </>
      )}

      {/* WebGL canvas gets appended here by the effect */}
      <div ref={containerRef} className="absolute inset-0" />
    </div>
  );
}
