/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PenTool, 
  Send, 
  RotateCcw, 
  BookOpen, 
  ChevronRight, 
  Star, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Sparkles,
  Eraser,
  Palette,
  Minus,
  Plus,
  Map as MapIcon,
  Trophy,
  ArrowLeft,
  Maximize2,
  Info,
  Lock
} from 'lucide-react';
import Canvas, { CanvasHandle } from './components/Canvas';
import GameMap, { Stage } from './components/GameMap';
import { GoogleGenAI, Type } from "@google/genai";
import Markdown from 'react-markdown';
import { cn } from './lib/utils';

// Proficiency Levels
const LEVELS = [
  { id: 'beginner', name: 'Beginner', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { id: 'intermediate', name: 'Intermediate', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'advanced', name: 'Advanced', color: 'bg-purple-100 text-purple-700 border-purple-200' },
];

const COLORS = [
  { name: 'Slate', value: '#1e293b' },
  { name: 'Blue', value: '#2563eb' },
  { name: 'Red', value: '#dc2626' },
  { name: 'Green', value: '#16a34a' },
];

const PEN_SIZES = [2, 4, 8, 12];

const GrammarRuleItem = ({ rule, explanation }: { rule: string; explanation: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  return (
    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-bold text-slate-800">{rule}</h4>
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-[10px] font-bold uppercase tracking-wider text-blue-600 hover:text-blue-700 transition-colors shrink-0"
        >
          {isExpanded ? 'Hide Details' : 'Show Rules'}
        </button>
      </div>
      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <p className="text-xs text-slate-600 mt-2 pt-2 border-t border-slate-200 leading-relaxed">
              {explanation}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface EvaluationResult {
  transcription: string;
  feedback: string;
  correctedText: string;
  score: number;
  grammarRules: { rule: string; explanation: string }[];
  selfAssessmentComparison?: string;
}

export default function App() {
  const [view, setView] = useState<'levels' | 'map' | 'writing'>('levels');
  const [selectedLevel, setSelectedLevel] = useState<'beginner' | 'intermediate' | 'advanced' | null>(null);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [selfConfidence, setSelfConfidence] = useState(3);
  const [showSelfAssessment, setShowSelfAssessment] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  
  // Paper lines customization
  const [showLines, setShowLines] = useState(true);
  const [lineDensity, setLineDensity] = useState(2.5);
  
  const [stages, setStages] = useState<Stage[]>(() => {
    const saved = localStorage.getItem('writewise_stages');
    if (saved) return JSON.parse(saved);
    
    const generateTopics = (skillTitle: string) => {
      return Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        title: `${skillTitle} Practice ${i + 1}`,
        isCompleted: false
      }));
    };

    return [
      // Beginner
      { 
        id: 1, title: 'Sentence Structure', level: 'beginner', isCompleted: false, isLocked: false,
        skillRequirements: 'Learn to write simple, clear sentences with correct subject-verb agreement.',
        topics: generateTopics('Sentence Structure')
      },
      { 
        id: 2, title: 'Basic Punctuation', level: 'beginner', isCompleted: false, isLocked: true,
        skillRequirements: 'Master the use of periods, commas, and question marks.',
        topics: generateTopics('Basic Punctuation')
      },
      { 
        id: 3, title: 'Noun Phrases', level: 'beginner', isCompleted: false, isLocked: true,
        skillRequirements: 'Expand your sentences using descriptive noun phrases.',
        topics: generateTopics('Noun Phrases')
      },
      { 
        id: 4, title: 'Verb Tenses', level: 'beginner', isCompleted: false, isLocked: true,
        skillRequirements: 'Use present and past tenses correctly in academic descriptions.',
        topics: generateTopics('Verb Tenses')
      },
      // Intermediate
      { 
        id: 5, title: 'Paragraph Cohesion', level: 'intermediate', isCompleted: false, isLocked: true,
        skillRequirements: 'Connect sentences logically using transition words.',
        topics: generateTopics('Paragraph Cohesion')
      },
      { 
        id: 6, title: 'Academic Vocabulary', level: 'intermediate', isCompleted: false, isLocked: true,
        skillRequirements: 'Use formal language and avoid colloquialisms.',
        topics: generateTopics('Academic Vocabulary')
      },
      { 
        id: 7, title: 'Active vs Passive', level: 'intermediate', isCompleted: false, isLocked: true,
        skillRequirements: 'Choose between active and passive voice for clarity and objectivity.',
        topics: generateTopics('Active vs Passive')
      },
      { 
        id: 8, title: 'Summarizing Skills', level: 'intermediate', isCompleted: false, isLocked: true,
        skillRequirements: 'Condense complex information into concise summaries.',
        topics: generateTopics('Summarizing Skills')
      },
      // Advanced
      { 
        id: 9, title: 'Critical Argumentation', level: 'advanced', isCompleted: false, isLocked: true,
        skillRequirements: 'Develop strong thesis statements and support them with evidence.',
        topics: generateTopics('Critical Argumentation')
      },
      { 
        id: 10, title: 'Synthesis of Sources', level: 'advanced', isCompleted: false, isLocked: true,
        skillRequirements: 'Integrate multiple viewpoints and cite sources correctly.',
        topics: generateTopics('Synthesis of Sources')
      },
      { 
        id: 11, title: 'Nuance & Hedging', level: 'advanced', isCompleted: false, isLocked: true,
        skillRequirements: 'Use cautious language (may, might, suggests) to express uncertainty.',
        topics: generateTopics('Nuance & Hedging')
      },
      { 
        id: 12, title: 'Abstract Writing', level: 'advanced', isCompleted: false, isLocked: true,
        skillRequirements: 'Write concise and effective abstracts for research papers.',
        topics: generateTopics('Abstract Writing')
      },
    ];
  });

  const [currentStage, setCurrentStage] = useState<Stage | null>(null);
  const [currentTopicIndex, setCurrentTopicIndex] = useState(0);
  const [topic, setTopic] = useState<string>("");
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isFetchingTopic, setIsFetchingTopic] = useState(false);
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [penColor, setPenColor] = useState(COLORS[0].value);
  const [penSize, setPenSize] = useState(4);
  const [isEraser, setIsEraser] = useState(false);
  const [canvasHeight, setCanvasHeight] = useState(400);
  
  const canvasRef = useRef<CanvasHandle>(null);

  useEffect(() => {
    localStorage.setItem('writewise_stages', JSON.stringify(stages));
  }, [stages]);

  const fetchTopic = async (stage: Stage, topicIndex: number) => {
    setIsFetchingTopic(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Generate a simple, authentic academic writing task for the skill: "${stage.title}".
        Level: ${stage.level}.
        Skill Requirements: ${stage.skillRequirements}.
        This is topic ${topicIndex + 1} of 10.
        Return ONLY the prompt for the student to write.`,
      });
      setTopic(response.text || `Practice ${stage.title} - Topic ${topicIndex + 1}`);
    } catch (err) {
      console.error(err);
      setTopic(`${stage.title} Practice ${topicIndex + 1}`);
    } finally {
      setIsFetchingTopic(false);
    }
  };

  const handleSelectStage = async (stage: Stage) => {
    setCurrentStage(stage);
    setCurrentTopicIndex(0);
    setView('writing');
    setResult(null);
    setCurrentStep(1);
    setCanvasHeight(400);
    await fetchTopic(stage, 0);
  };

  const handleClear = () => {
    canvasRef.current?.clear();
    setResult(null);
    setError(null);
  };

  const addMoreSpace = () => {
    setCanvasHeight(prev => prev + 200);
  };

  const handleSubmitClick = () => {
    if (canvasRef.current?.isEmpty()) {
      setError("Please write your response before submitting.");
      return;
    }
    setShowSelfAssessment(true);
  };

  const handleFinalSubmit = async () => {
    setShowSelfAssessment(false);
    setIsEvaluating(true);
    setError(null);
    
    try {
      const imageData = canvasRef.current?.getImageData();
      if (!imageData) throw new Error("Could not capture drawing.");

      const base64Data = imageData.split(',')[1];
      
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { inlineData: { mimeType: "image/png", data: base64Data } },
              {
                text: `You are an expert Academic English Writing Tutor.
                Task: "${topic}" (Step ${currentStep} of 3).
                Student Level: ${currentStage?.level}.
                Student Self-Confidence: ${selfConfidence}/5.

                Analyze the handwriting and provide a pedagogical evaluation.
                
                JSON format:
                - transcription: The text found.
                - feedback: Adaptive feedback explaining errors and linking to academic rules.
                - correctedText: Academic version of the text.
                - score: 0-100.
                - grammarRules: [{ rule: string, explanation: string }]
                - selfAssessmentComparison: Compare the student's confidence (${selfConfidence}/5) with your actual evaluation. Are they overconfident or underestimating themselves?`
              }
            ]
          }
        ],
        config: { responseMimeType: "application/json" }
      });

      const data = JSON.parse(response.text || "{}") as EvaluationResult;
      setResult(data);

      if (data.score >= 70 && currentStage) {
        setStages(prev => {
          const next = [...prev];
          const stageIndex = next.findIndex(s => s.id === currentStage.id);
          next[stageIndex].topics[currentTopicIndex].isCompleted = true;
          
          const allTopicsDone = next[stageIndex].topics.every(t => t.isCompleted);
          if (allTopicsDone) {
            next[stageIndex].isCompleted = true;
            if (stageIndex + 1 < next.length) next[stageIndex + 1].isLocked = false;
          }
          return next;
        });
      }
    } catch (err) {
      console.error(err);
      setError("Evaluation failed. Please try again.");
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleTopicChange = async (index: number) => {
    if (!currentStage) return;
    setCurrentTopicIndex(index);
    setResult(null);
    setError(null);
    canvasRef.current?.clear();
    await fetchTopic(currentStage, index);
  };

  return (
    <div className={cn(
      "min-h-screen transition-colors duration-500",
      isFocusMode ? "bg-slate-100" : "bg-slate-50",
      "text-slate-900 font-sans selection:bg-blue-100"
    )}>
      {/* Header */}
      {!isFocusMode && (
        <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-slate-800 p-2 rounded-lg">
                <PenTool className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-slate-800">Academic Writer</h1>
            </div>
            
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setView('map')}
                className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors"
              >
                <MapIcon className="w-4 h-4" />
                Journey
              </button>
              <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-black text-slate-600">
                  {stages.filter(s => s.isCompleted).length} / {stages.length}
                </span>
              </div>
            </div>
          </div>
        </header>
      )}

      <main className={cn("max-w-4xl mx-auto px-4 py-8", isFocusMode && "pt-20")}>
        <AnimatePresence mode="wait">
          {view === 'levels' ? (
            <motion.div
              key="levels-view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              {LEVELS.map((level) => {
                const levelStages = stages.filter(s => s.level === level.id);
                // Level is unlocked if it's beginner OR all previous level's stages are completed
                const isUnlocked = level.id === 'beginner' || (
                  level.id === 'intermediate' ? stages.filter(s => s.level === 'beginner').every(s => s.isCompleted) : 
                  level.id === 'advanced' ? stages.filter(s => s.level === 'intermediate').every(s => s.isCompleted) : false
                );
                
                return (
                  <button
                    key={level.id}
                    disabled={!isUnlocked}
                    onClick={() => { setSelectedLevel(level.id as any); setView('map'); }}
                    className={cn(
                      "p-8 rounded-3xl border-2 transition-all text-left group relative overflow-hidden",
                      isUnlocked 
                        ? "bg-white border-slate-200 hover:border-blue-500 hover:shadow-xl" 
                        : "bg-slate-50 border-slate-100 opacity-60 cursor-not-allowed"
                    )}
                  >
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-6", level.color)}>
                      <Trophy className="w-6 h-6" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-800 mb-2">{level.name}</h3>
                    <p className="text-sm text-slate-500 mb-6">Master the {level.name} writing skills through intensive modules.</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        {levelStages.filter(s => s.isCompleted).length} / {levelStages.length} Skills
                      </span>
                      {isUnlocked ? <ChevronRight className="w-5 h-5 text-blue-500 group-hover:translate-x-1 transition-transform" /> : <Lock className="w-5 h-5 text-slate-300" />}
                    </div>
                  </button>
                );
              })}
            </motion.div>
          ) : view === 'map' ? (
            <motion.div
              key="map-view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                <button 
                  onClick={() => setView('levels')}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="text-center">
                  <h2 className="text-3xl font-black text-slate-800 mb-2 uppercase tracking-tight">
                    {LEVELS.find(l => l.id === selectedLevel)?.name} Skill Ladder
                  </h2>
                  <p className="text-slate-500 italic">"The ladder of success is best climbed by stepping on the rungs of opportunity."</p>
                </div>
                <div className="w-10" />
              </div>
              <div className="max-h-[60vh] overflow-y-auto scroll-smooth">
                <GameMap 
                  stages={stages.filter(s => s.level === selectedLevel)} 
                  currentStageId={stages.find(s => s.level === selectedLevel && !s.isCompleted && !s.isLocked)?.id || 0}
                  onSelectStage={handleSelectStage}
                />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="writing-view"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              {/* Topic Switcher */}
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between gap-4 overflow-x-auto">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setView('map')}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="h-8 w-px bg-slate-100 mx-2" />
                  <div className="flex items-center gap-2">
                    {currentStage?.topics.map((t, i) => (
                      <button
                        key={t.id}
                        onClick={() => handleTopicChange(i)}
                        className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center font-bold transition-all border-2",
                          currentTopicIndex === i 
                            ? "bg-blue-500 border-blue-600 text-white shadow-md scale-110" 
                            : t.isCompleted
                              ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                              : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                        )}
                      >
                        {t.isCompleted ? <CheckCircle2 className="w-5 h-5" /> : i + 1}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-black text-slate-600 uppercase tracking-widest">
                    {currentStage?.topics.filter(t => t.isCompleted).length} / 10 Topics
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Task & Canvas */}
                <div className={cn("space-y-6 transition-all duration-500", isFocusMode ? "lg:col-span-12 max-w-2xl mx-auto" : "lg:col-span-7")}>
                  <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 text-slate-500">
                        <BookOpen className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">
                          Skill: {currentStage?.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => setIsFocusMode(!isFocusMode)}
                          className={cn(
                            "p-1.5 rounded-md transition-colors",
                            isFocusMode ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-100"
                          )}
                          title="Focus Mode"
                        >
                          <Maximize2 className="w-4 h-4" />
                        </button>
                        {isFetchingTopic && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
                      </div>
                    </div>
                    
                    <div className="mb-4 p-3 bg-blue-50 rounded-xl border border-blue-100">
                      <div className="flex items-center gap-2 text-blue-700 mb-1">
                        <Star className="w-3 h-3 fill-current" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Skill Requirements</span>
                      </div>
                      <p className="text-xs text-blue-800 font-medium leading-relaxed">
                        {currentStage?.skillRequirements}
                      </p>
                    </div>

                    <h2 className="text-xl font-semibold text-slate-800 leading-tight">
                      {topic || "Preparing your academic task..."}
                    </h2>
                  </section>

                  <div className="space-y-4">
                    {/* Toolbar */}
                    <div className="flex flex-wrap items-center gap-4 bg-white p-3 rounded-xl shadow-sm border border-slate-200">
                      <div className="flex items-center gap-1.5 pr-4 border-r border-slate-100">
                        {COLORS.map((c) => (
                          <button
                            key={c.value}
                            onClick={() => { setPenColor(c.value); setIsEraser(false); }}
                            className={cn(
                              "w-6 h-6 rounded-full transition-all hover:scale-110",
                              penColor === c.value && !isEraser ? "ring-2 ring-offset-2 ring-slate-800 scale-110" : "opacity-80"
                            )}
                            style={{ backgroundColor: c.value }}
                          />
                        ))}
                      </div>

                      <div className="flex items-center gap-2 pr-4 border-r border-slate-100">
                        {PEN_SIZES.map((size) => (
                          <button
                            key={size}
                            onClick={() => setPenSize(size)}
                            className={cn(
                              "flex items-center justify-center rounded-md transition-all hover:bg-slate-50",
                              penSize === size ? "bg-slate-100 text-slate-800" : "text-slate-400"
                            )}
                            style={{ width: '28px', height: '28px' }}
                          >
                            <div className="rounded-full bg-current" style={{ width: `${size}px`, height: `${size}px` }} />
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-2 pr-4 border-r border-slate-100">
                        <button
                          onClick={() => setIsEraser(!isEraser)}
                          className={cn(
                            "p-2 rounded-lg transition-all",
                            isEraser ? "bg-slate-100 text-slate-800" : "text-slate-400 hover:bg-slate-50"
                          )}
                        >
                          <Eraser className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Paper Lines Controls */}
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setShowLines(!showLines)}
                          className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                            showLines ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white border-slate-200 text-slate-400"
                          )}
                        >
                          <Palette className="w-3 h-3" />
                          Lines
                        </button>
                        {showLines && (
                          <div className="flex items-center gap-2 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                            <button onClick={() => setLineDensity(Math.max(1, lineDensity - 0.5))} className="p-1 hover:bg-slate-200 rounded text-slate-500">
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-[10px] font-black text-slate-600 w-6 text-center">{lineDensity}</span>
                            <button onClick={() => setLineDensity(Math.min(5, lineDensity + 0.5))} className="p-1 hover:bg-slate-200 rounded text-slate-500">
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Canvas Container */}
                    <div className="relative w-full" style={{ height: `${canvasHeight}px` }}>
                      <Canvas 
                        ref={canvasRef} 
                        color={penColor}
                        lineWidth={penSize}
                        isEraser={isEraser}
                        showLines={showLines}
                        lineDensity={lineDensity}
                      />
                    
                    <div className="absolute bottom-4 right-4 flex gap-2 z-20">
                      <button
                        onClick={handleClear}
                        className="p-3 bg-white/90 backdrop-blur shadow-lg rounded-full text-slate-600 hover:text-red-500 transition-all active:scale-95"
                      >
                        <RotateCcw className="w-5 h-5" />
                      </button>
                      <button
                        onClick={handleSubmitClick}
                        disabled={isEvaluating}
                        className={cn(
                          "flex items-center gap-2 px-6 py-3 bg-slate-800 text-white font-bold rounded-full shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
                          !isEvaluating && "hover:bg-slate-900"
                        )}
                      >
                        {isEvaluating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                        {isEvaluating ? "Evaluating..." : "Submit Task"}
                      </button>
                    </div>
                  </div>

                  <button 
                    onClick={addMoreSpace}
                    className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 font-bold flex items-center justify-center gap-2 hover:border-slate-300 hover:text-slate-500 transition-all"
                  >
                    <Plus className="w-5 h-5" /> Expand Workspace
                  </button>
                </div>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl flex items-start gap-3"
                  >
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <p className="text-sm font-medium">{error}</p>
                  </motion.div>
                )}
              </div>

              {/* Right Column: Results (Hidden in Focus Mode) */}
              {!isFocusMode && (
                <div className="lg:col-span-5">
                  <AnimatePresence mode="wait">
                    {result ? (
                      <motion.div
                        key="result"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-6"
                      >
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-center">
                          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-50 text-slate-800 mb-4 border-2 border-slate-100">
                            <span className="text-3xl font-black">{result.score}</span>
                          </div>
                          <h3 className="text-lg font-bold text-slate-800">Academic Score</h3>
                          {result.selfAssessmentComparison && (
                            <p className="mt-2 text-xs text-slate-500 italic px-4">
                              {result.selfAssessmentComparison}
                            </p>
                          )}
                        </div>

                        <div className="space-y-4">
                          <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                            <div className="flex items-center gap-2 text-slate-400 mb-3">
                              <Info className="w-4 h-4" />
                              <span className="text-xs font-bold uppercase tracking-wider">Transcription</span>
                            </div>
                            <p className="text-slate-700 italic font-medium leading-relaxed">"{result.transcription}"</p>
                          </section>

                          <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                            <div className="flex items-center gap-2 text-slate-800 mb-3">
                              <Sparkles className="w-4 h-4" />
                              <span className="text-xs font-bold uppercase tracking-wider">Adaptive Feedback</span>
                            </div>
                            <div className="prose prose-sm prose-slate max-w-none">
                              <Markdown>{result.feedback}</Markdown>
                            </div>
                          </section>

                          {result.grammarRules && result.grammarRules.length > 0 && (
                            <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                              <div className="flex items-center gap-2 text-slate-500 mb-3">
                                <AlertCircle className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase tracking-wider">Grammar & Style Rules</span>
                              </div>
                              <div className="space-y-3">
                                {result.grammarRules.map((rule, i) => (
                                  <GrammarRuleItem key={i} rule={rule.rule} explanation={rule.explanation} />
                                ))}
                              </div>
                            </section>
                          )}

                          <section className="bg-slate-800 p-5 rounded-2xl shadow-lg text-white">
                            <div className="flex items-center gap-2 opacity-80 mb-3">
                              <CheckCircle2 className="w-4 h-4" />
                              <span className="text-xs font-bold uppercase tracking-wider">Academic Revision</span>
                            </div>
                            <p className="font-medium leading-relaxed">{result.correctedText}</p>
                          </section>

                          {result.score >= 70 && currentTopicIndex < 9 && (
                            <motion.button
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              onClick={() => handleTopicChange(currentTopicIndex + 1)}
                              className="w-full py-4 bg-emerald-500 text-white font-black rounded-2xl shadow-lg hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
                            >
                              Next Topic <ChevronRight className="w-5 h-5" />
                            </motion.button>
                          )}

                          {result.score >= 70 && currentTopicIndex === 9 && (
                            <motion.button
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              onClick={() => setView('map')}
                              className="w-full py-4 bg-blue-500 text-white font-black rounded-2xl shadow-lg hover:bg-blue-600 transition-all flex items-center justify-center gap-2"
                            >
                              Skill Mastered! Back to Map <MapIcon className="w-5 h-5" />
                            </motion.button>
                          )}
                        </div>
                      </motion.div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-slate-100/50 rounded-3xl border-2 border-dashed border-slate-200">
                        <PenTool className="w-8 h-8 text-slate-300 mb-4" />
                        <h3 className="text-slate-600 font-semibold mb-2">Awaiting Submission</h3>
                        <p className="text-slate-400 text-sm">Your academic evaluation will appear here after submission.</p>
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </main>

      {/* Self-Assessment Modal */}
      <AnimatePresence>
        {showSelfAssessment && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full text-center"
            >
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-8 h-8 text-slate-800" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Self-Assessment</h3>
              <p className="text-slate-500 mb-8">Before the AI evaluates your work, how confident are you in your writing?</p>
              
              <div className="space-y-6 mb-8">
                <input 
                  type="range" 
                  min="1" 
                  max="5" 
                  value={selfConfidence}
                  onChange={(e) => setSelfConfidence(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-800"
                />
                <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-widest">
                  <span>Not Confident</span>
                  <span>Very Confident</span>
                </div>
                <div className="text-4xl font-black text-slate-800">{selfConfidence}/5</div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowSelfAssessment(false)}
                  className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleFinalSubmit}
                  className="flex-1 py-3 bg-slate-800 text-white font-bold rounded-xl shadow-lg hover:bg-slate-900 transition-all"
                >
                  Confirm & Submit
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Footer */}
      <footer className="max-w-4xl mx-auto px-4 py-12 text-center text-slate-400 text-xs">
        <p>© 2026 WriteWise AI Tutor. Powered by Gemini.</p>
      </footer>
    </div>
  );
}
