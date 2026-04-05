import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { Lock, Check, Star, Trophy } from 'lucide-react';

export interface Topic {
  id: number;
  title: string;
  isCompleted: boolean;
}

export interface Stage {
  id: number;
  title: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  isCompleted: boolean;
  isLocked: boolean;
  skillRequirements: string;
  topics: Topic[];
}

interface GameMapProps {
  stages: Stage[];
  currentStageId: number;
  onSelectStage: (stage: Stage) => void;
}

const GameMap: React.FC<GameMapProps> = ({ stages, currentStageId, onSelectStage }) => {
  const mapHeight = 400 + stages.length * 150;

  return (
    <div className="relative w-full p-8 pt-20 overflow-x-hidden" style={{ minHeight: `${mapHeight}px` }}>
      {/* Background Path */}
      <svg 
        className="absolute inset-0 w-full h-full pointer-events-none" 
        viewBox={`0 0 800 ${mapHeight}`}
        preserveAspectRatio="xMidYMin meet"
      >
        <path
          d={generatePath(stages.length)}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="8"
          strokeDasharray="12 12"
          className="opacity-50"
        />
      </svg>

      <div className="relative z-10 flex flex-col items-center pt-36 max-w-[800px] mx-auto">
        {stages.map((stage, index) => {
          const isCurrent = stage.id === currentStageId;
          const isEven = index % 2 === 0;

          return (
            <motion.div
              key={stage.id}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "relative flex items-center gap-6",
                isEven ? "flex-row" : "flex-row-reverse"
              )}
              style={{ 
                height: '150px',
                transform: `translateX(${isEven ? '-100px' : '100px'})`
              }}
            >
              {/* Stage Node */}
              <button
                onClick={() => !stage.isLocked && onSelectStage(stage)}
                disabled={stage.isLocked}
                className={cn(
                  "relative w-20 h-20 rounded-2xl flex items-center justify-center transition-all shadow-lg border-b-4 active:border-b-0 active:translate-y-1",
                  stage.isLocked 
                    ? "bg-slate-200 border-slate-300 text-slate-400 cursor-not-allowed" 
                    : isCurrent 
                      ? "bg-blue-500 border-blue-700 text-white animate-bounce" 
                      : stage.isCompleted 
                        ? "bg-emerald-500 border-emerald-700 text-white" 
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
              >
                {stage.isLocked ? (
                  <Lock className="w-8 h-8" />
                ) : stage.isCompleted ? (
                  <Check className="w-10 h-10" />
                ) : (
                  <span className="text-2xl font-black">{index + 1}</span>
                )}

                {/* Pixel Character for Current Stage */}
                {isCurrent && (
                  <motion.div 
                    className="absolute -top-12 left-1/2 -translate-x-1/2 w-12 h-12"
                    animate={{ y: [0, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                  >
                    <div className="w-full h-full bg-red-500 rounded-sm relative shadow-md">
                      {/* Simple pixel face */}
                      <div className="absolute top-2 left-2 w-2 h-2 bg-black rounded-full" />
                      <div className="absolute top-2 right-2 w-2 h-2 bg-black rounded-full" />
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-4 h-1 bg-black opacity-50" />
                    </div>
                  </motion.div>
                )}
              </button>

              {/* Stage Info */}
              <div className={cn(
                "flex flex-col",
                isEven ? "text-left" : "text-right"
              )}>
                <span className={cn(
                  "text-xs font-bold uppercase tracking-widest mb-1",
                  stage.level === 'beginner' ? "text-emerald-500" : 
                  stage.level === 'intermediate' ? "text-blue-500" : "text-purple-500"
                )}>
                  {stage.level}
                </span>
                <h4 className="text-lg font-bold text-slate-800">{stage.title}</h4>
                {stage.isCompleted && (
                  <div className="flex gap-1 mt-1 justify-start">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}

        {/* Final Trophy */}
        <div className="mt-12 flex flex-col items-center">
          <div className="w-24 h-24 bg-yellow-400 rounded-full flex items-center justify-center shadow-xl border-b-8 border-yellow-600">
            <Trophy className="w-12 h-12 text-white" />
          </div>
          <span className="mt-4 font-black text-yellow-600 uppercase tracking-widest">Grand Master</span>
        </div>
      </div>
    </div>
  );
};

// Helper to generate a wavy path
function generatePath(count: number) {
  let d = "M 400 75";
  for (let i = 0; i < count; i++) {
    const y = 75 + (i + 1) * 150;
    const x = i % 2 === 0 ? 300 : 500;
    d += ` Q ${i % 2 === 0 ? 500 : 300} ${y - 75}, ${x} ${y}`;
  }
  return d;
}

export default GameMap;
