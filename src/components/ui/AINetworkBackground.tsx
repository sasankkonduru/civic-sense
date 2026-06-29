import React, { useState, useEffect } from "react";
import { motion } from "motion/react";

export function AINetworkBackground() {
  const [nodes, setNodes] = useState<{ id: number; x: number; y: number; size: number }[]>([]);

  useEffect(() => {
    const generatedNodes = Array.from({ length: 24 }).map((_, i) => ({
      id: i,
      x: 5 + Math.random() * 90,
      y: 5 + Math.random() * 90,
      size: 1.5 + Math.random() * 2.5,
    }));
    setNodes(generatedNodes);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none -z-20" aria-hidden="true">
      {/* Network connection lines */}
      <svg className="absolute inset-0 w-full h-full opacity-35">
        {nodes.map((node, i) => {
          const nextNode1 = nodes[(i + 1) % nodes.length];
          const nextNode2 = nodes[(i + 4) % nodes.length];
          return (
            <React.Fragment key={node.id}>
              {nextNode1 && (
                <motion.line
                  x1={`${node.x}%`}
                  y1={`${node.y}%`}
                  x2={`${nextNode1.x}%`}
                  y2={`${nextNode1.y}%`}
                  stroke="rgba(99, 102, 241, 0.12)"
                  strokeWidth="0.8"
                  initial={{ strokeDasharray: "120 120", strokeDashoffset: 120 }}
                  animate={{ strokeDashoffset: [120, 0, -120] }}
                  transition={{
                    repeat: Infinity,
                    duration: 12 + Math.random() * 10,
                    ease: "linear",
                  }}
                />
              )}
              {nextNode2 && (
                <motion.line
                  x1={`${node.x}%`}
                  y1={`${node.y}%`}
                  x2={`${nextNode2.x}%`}
                  y2={`${nextNode2.y}%`}
                  stroke="rgba(139, 92, 246, 0.08)"
                  strokeWidth="1"
                  initial={{ strokeDasharray: "90 90", strokeDashoffset: 0 }}
                  animate={{ strokeDashoffset: [0, 90, 180] }}
                  transition={{
                    repeat: Infinity,
                    duration: 15 + Math.random() * 8,
                    ease: "linear",
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </svg>

      {/* Grid lines layout to emphasize "Command Grid" style */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(99,102,241,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(99,102,241,0.02)_1px,transparent_1px)] bg-[size:3rem_3rem]" />

      {/* Pulsing signal nodes */}
      {nodes.map((node) => (
        <motion.div
          key={node.id}
          className="absolute bg-gradient-to-tr from-indigo-500/40 to-purple-550/40 rounded-full"
          style={{
            left: `${node.x}%`,
            top: `${node.y}%`,
            width: `${node.size}px`,
            height: `${node.size}px`,
          }}
          animate={{
            scale: [1, 1.8, 1],
            opacity: [0.2, 0.6, 0.2],
          }}
          transition={{
            duration: 4 + (node.id % 5) * 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
