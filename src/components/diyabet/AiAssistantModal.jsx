'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Mic, MicOff, Camera, Upload, Send, X,
  CheckCircle2, AlertCircle, Utensils, Activity, Syringe,
  Loader2, RefreshCw, MessageSquare, Bot, User, ArrowRight,
  Calculator, Sliders, Info, ShieldAlert, Zap, Copy, Check
} from 'lucide-react';

const DEFAULT_SETTINGS = {
  icrMorning: 10,
  icrLunch: 12,
  icrDinner: 12,
  isf: 40,
  targetGlucose: 110,
  diaHours: 3.5,
  bolusBrand: 'Novorapid',
  basalBrand: 'Lantus',
};

export default function AiAssistantModal({ isOpen, onClose, onSaveRecord, patientContext }) {
  const [activeTab, setActiveTab] = useState('voice'); // 'voice' | 'calc' | 'food' | 'chat'
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [copiedIndex, setCopiedIndex] = useState(null);

  // Voice & Text state
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState(null);

  // Calculator state
  const [calcGlucose, setCalcGlucose] = useState(140);
  const [calcCarbs, setCalcCarbs] = useState(45);
  const [calcMealTime, setCalcMealTime] = useState('icrLunch');

  // Food state
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isAnalyzingFood, setIsAnalyzingFood] = useState(false);
  const [foodAnalysisResult, setFoodAnalysisResult] = useState(null);

  // Chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);

  const recognitionRef = useRef(null);
  const chatEndRef = useRef(null);

  // Load settings from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('td1_diyabet_settings');
      if (saved) {
        setSettings(JSON.parse(saved));
      }
    } catch (e) {
      console.error(e);
    }
  }, [isOpen]);

  // Initial welcome message with settings context
  useEffect(() => {
    if (isOpen && chatMessages.length === 0) {
      setChatMessages([
        {
          sender: 'ai',
          text: `👋 Merhaba! Ben DiaAI v2, kişiselleştirilmiş Tip 1 Diyabet akıllı asistanınız.\n\n⚙️ Aktif Profiliniz:\n• ICR: 1U / ${settings.icrLunch}g Karbonhidrat\n• ISF: 1U / ${settings.isf} mg/dL Düşüş\n• Hedef KŞ: ${settings.targetGlucose} mg/dL\n\n🎯 Nasıl yardımcı olabilirim? Sesli konuşabilir, yemek fotoğrafı yükleyebilir veya doz hesabı yapabilirsiniz.`,
          timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  }, [isOpen, settings]);

  // Speech Recognition setup
  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'tr-TR';

      recognitionRef.current.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInputText(transcript);
      };

      recognitionRef.current.onerror = (err) => {
        console.error('Speech recognition error:', err);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  if (!isOpen) return null;

  // Bolus Calculation Logic
  const currentIcr = settings[calcMealTime] || 10;
  const carbDose = calcCarbs > 0 ? (calcCarbs / currentIcr) : 0;
  const bgDiff = calcGlucose - settings.targetGlucose;
  const correctionDose = bgDiff > 0 ? (bgDiff / settings.isf) : 0;
  const totalRecommendedBolus = (carbDose + correctionDose).toFixed(1);

  // Toggle Voice Recording
  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Tarayıcınız ses tanıma özelliğini desteklemiyor. Lütfen klavyeden yazarak deneyin.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setInputText('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  // Parse Text / Voice to Record
  const handleParseText = async () => {
    if (!inputText.trim()) return;
    setIsParsing(true);
    setParsedData(null);

    try {
      const res = await fetch('/api/diyabet/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'parse_text', text: inputText, settings }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setParsedData(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsParsing(false);
    }
  };

  // Image File Upload Handler
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Analyze Food Image
  const handleAnalyzeFood = async () => {
    if (!imagePreview) return;
    setIsAnalyzingFood(true);
    setFoodAnalysisResult(null);

    try {
      const res = await fetch('/api/diyabet/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'analyze_food',
          imageBase64: imagePreview,
          settings
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setFoodAnalysisResult(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzingFood(false);
    }
  };

  // Send Chat Message
  const handleSendChat = async (textToSend = null) => {
    const message = textToSend || chatInput;
    if (!message.trim()) return;

    const userMsg = {
      sender: 'user',
      text: message,
      timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, userMsg]);
    if (!textToSend) setChatInput('');
    setIsSendingChat(true);

    try {
      const res = await fetch('/api/diyabet/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat',
          text: message,
          patientContext,
          settings
        }),
      });
      const data = await res.json();
      const aiReply = data.reply || 'Anlaşıldı. Diyabet yönetimi hakkında başka bir sorunuz var mı?';

      setChatMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: aiReply,
          timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSendingChat(false);
    }
  };

  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Confirm and Save AI Parsed Record to Log History
  const handleConfirmSaveParsed = (dataToSave) => {
    const record = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      glucose: dataToSave.glucose || null,
      insulinUnits: dataToSave.insulinUnits || 0,
      insulinType: dataToSave.insulinType || 'bolus',
      carbs: dataToSave.carbs || 0,
      mealType: dataToSave.mealType || null,
      tag: dataToSave.tag || 'genel',
      notes: dataToSave.notes || 'DiaAI Asistan ile eklendi',
      createdAt: new Date().toISOString(),
    };

    onSaveRecord(record);
    setParsedData(null);
    setInputText('');
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[88vh] backdrop-blur-2xl"
        >
          {/* Futuristic Avatar & Status Header Banner */}
          <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-teal-950/80 p-5 text-white relative shrink-0 border-b border-slate-800/80">
            
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-800/60 hover:bg-slate-700 text-slate-300 transition-colors z-20"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-4">
              {/* DiaAI Avatar Image */}
              <div className="relative w-16 h-16 rounded-2xl p-0.5 bg-gradient-to-tr from-teal-500 via-cyan-400 to-indigo-500 shadow-lg shadow-teal-500/20 shrink-0">
                <img
                  src="/dia_ai_avatar.png"
                  alt="DiaAI Avatar"
                  className="w-full h-full object-cover rounded-[14px]"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-slate-950 rounded-full animate-pulse" />
              </div>

              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-xl font-extrabold tracking-tight text-white flex items-center space-x-2">
                    <span>DiaAI Medikal Asistan</span>
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-teal-500/20 text-teal-300 border border-teal-500/40">
                    v2 ONLINE
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Kişisel ICR: <span className="text-amber-400 font-bold">1U/{settings.icrLunch}g</span> • ISF: <span className="text-cyan-400 font-bold">{settings.isf} mg/dL</span> • Hedef: <span className="text-emerald-400 font-bold">{settings.targetGlucose} mg/dL</span>
                </p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="grid grid-cols-4 gap-1 bg-slate-950/80 p-1 rounded-2xl mt-4 text-xs font-bold border border-slate-800/80">
              <button
                onClick={() => setActiveTab('voice')}
                className={`py-2.5 rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
                  activeTab === 'voice' ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 shadow-lg font-black' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Mic className="w-3.5 h-3.5" />
                <span>Sesli Kayıt</span>
              </button>

              <button
                onClick={() => setActiveTab('calc')}
                className={`py-2.5 rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
                  activeTab === 'calc' ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 shadow-lg font-black' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>Akıllı Bolus</span>
              </button>

              <button
                onClick={() => setActiveTab('food')}
                className={`py-2.5 rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
                  activeTab === 'food' ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 shadow-lg font-black' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Yemek Analiz</span>
              </button>

              <button
                onClick={() => setActiveTab('chat')}
                className={`py-2.5 rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
                  activeTab === 'chat' ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 shadow-lg font-black' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Sohbet & Soru</span>
              </button>
            </div>
          </div>

          {/* TAB 1: VOICE & TEXT ENTRY */}
          {activeTab === 'voice' && (
            <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
              
              {/* Big Animated Microphone */}
              <div className="flex flex-col items-center justify-center p-8 bg-slate-950/60 border border-slate-800/80 rounded-3xl text-center space-y-5 relative overflow-hidden">
                
                {/* Equalizer Wave Bars when listening */}
                {isListening && (
                  <div className="flex items-center space-x-1.5 h-6">
                    {[16, 24, 12, 32, 20, 28, 14, 26].map((h, i) => (
                      <motion.div
                        key={i}
                        animate={{ height: [8, h, 8] }}
                        transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.1 }}
                        className="w-1.5 bg-rose-500 rounded-full"
                      />
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={toggleListening}
                  className={`relative p-6 rounded-full transition-all duration-300 ${
                    isListening
                      ? 'bg-rose-500 text-white shadow-2xl shadow-rose-500/50 scale-110'
                      : 'bg-gradient-to-r from-teal-500 via-cyan-500 to-indigo-500 text-slate-950 shadow-xl shadow-teal-500/25 hover:scale-105'
                  }`}
                >
                  {isListening ? (
                    <MicOff className="w-10 h-10" />
                  ) : (
                    <Mic className="w-10 h-10" />
                  )}
                  
                  {isListening && (
                    <span className="absolute -inset-3 rounded-full border-2 border-rose-500 animate-ping opacity-75" />
                  )}
                </button>

                <div>
                  <h4 className="font-bold text-sm text-slate-200">
                    {isListening ? 'Sizi Dinliyorum... Konuşabilirsiniz' : 'Mikrofona Basıp Doğal Dilde Konuşun'}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">
                    Örn: *"Şekerim 150 mg/dL çıktı, 45 gram karbonhidrat yedim ve 4 ünite Novorapid insülin vurdum"*
                  </p>
                </div>
              </div>

              {/* Text Input Area */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-400">Veya Klavyeden Yazın:</label>
                <div className="relative">
                  <textarea
                    rows={3}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Kan şekeri, insülin dozu veya yemek bilgilerinizi yazın..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <button
                    onClick={handleParseText}
                    disabled={isParsing || !inputText.trim()}
                    className="absolute right-3 bottom-3 px-4 py-2 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center space-x-1.5"
                  >
                    {isParsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    <span>AI ile Çözümle</span>
                  </button>
                </div>
              </div>

              {/* Parsed Output Result Card */}
              {parsedData && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-br from-teal-950/80 to-slate-950 border border-teal-500/40 p-5 rounded-3xl space-y-4 shadow-xl"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-teal-400 flex items-center space-x-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Yapay Zeka Çözümleme Sonucu</span>
                    </span>
                    <span className="text-[10px] text-slate-400 bg-slate-900 px-2.5 py-1 rounded-full border border-slate-800">
                      Onay Bekliyor
                    </span>
                  </div>

                  {parsedData.aiMessage && (
                    <p className="text-xs text-slate-300 italic">"{parsedData.aiMessage}"</p>
                  )}

                  {/* Extracted Badges */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {parsedData.glucose && (
                      <div className="bg-slate-900 border border-teal-500/40 px-3 py-1.5 rounded-xl text-xs font-extrabold text-teal-300 flex items-center space-x-1">
                        <Activity className="w-4 h-4 text-teal-400" />
                        <span>KŞ: {parsedData.glucose} mg/dL</span>
                      </div>
                    )}

                    {parsedData.insulinUnits && (
                      <div className="bg-slate-900 border border-cyan-500/40 px-3 py-1.5 rounded-xl text-xs font-extrabold text-cyan-300 flex items-center space-x-1">
                        <Syringe className="w-4 h-4 text-cyan-400" />
                        <span>İnsülin: {parsedData.insulinUnits} U ({parsedData.insulinType || 'Bolus'})</span>
                      </div>
                    )}

                    {parsedData.carbs && (
                      <div className="bg-slate-900 border border-amber-500/40 px-3 py-1.5 rounded-xl text-xs font-extrabold text-amber-300 flex items-center space-x-1">
                        <Utensils className="w-4 h-4 text-amber-400" />
                        <span>Karbonhidrat: {parsedData.carbs}g</span>
                      </div>
                    )}
                  </div>

                  {/* Confirm Save Button */}
                  <button
                    onClick={() => handleConfirmSaveParsed(parsedData)}
                    className="w-full py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-black text-sm rounded-xl shadow-lg hover:from-teal-400 hover:to-emerald-400 transition-all flex items-center justify-center space-x-2"
                  >
                    <CheckCircle2 className="w-5 h-5 text-slate-950" />
                    <span>Bu Verileri Günlüğe Kaydet</span>
                  </button>
                </motion.div>
              )}

            </div>
          )}

          {/* TAB 2: SMART BOLUS CALCULATOR WIDGET */}
          {activeTab === 'calc' && (
            <div className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar text-xs">
              <div className="bg-gradient-to-r from-slate-950 to-teal-950/60 p-4 rounded-2xl border border-teal-500/30 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-teal-300 flex items-center space-x-2">
                    <Calculator className="w-4 h-4 text-teal-400" />
                    <span>Kişiselleştirilmiş Bolus İnsülin Hesaplayıcı</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    ICR: 1U/{currentIcr}g Karb | ISF: 1U/{settings.isf} mg/dL | Hedef KŞ: {settings.targetGlucose} mg/dL
                  </p>
                </div>
              </div>

              {/* Calculator Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <label className="block font-semibold text-slate-300 mb-1">Mevcut KŞ (mg/dL)</label>
                  <input
                    type="number"
                    value={calcGlucose}
                    onChange={(e) => setCalcGlucose(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-center text-lg font-bold text-teal-300"
                  />
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <label className="block font-semibold text-slate-300 mb-1">Karbonhidrat (g)</label>
                  <input
                    type="number"
                    value={calcCarbs}
                    onChange={(e) => setCalcCarbs(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-center text-lg font-bold text-amber-300"
                  />
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <label className="block font-semibold text-slate-300 mb-1">Öğün Zamanı</label>
                  <select
                    value={calcMealTime}
                    onChange={(e) => setCalcMealTime(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 font-bold text-slate-200"
                  >
                    <option value="icrMorning">Sabah (ICR: 1U/{settings.icrMorning}g)</option>
                    <option value="icrLunch">Öğle (ICR: 1U/{settings.icrLunch}g)</option>
                    <option value="icrDinner">Akşam (ICR: 1U/{settings.icrDinner}g)</option>
                  </select>
                </div>
              </div>

              {/* Calculation Formula Breakdown */}
              <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-3">
                <h5 className="font-bold text-slate-300 border-b border-slate-800 pb-2">Matematiksel Doz Hesabı:</h5>
                
                <div className="flex items-center justify-between text-slate-300">
                  <span>Yemek Dozu ({calcCarbs}g / {currentIcr}g ICR):</span>
                  <strong className="text-amber-400 font-mono">{carbDose.toFixed(2)} U</strong>
                </div>

                <div className="flex items-center justify-between text-slate-300">
                  <span>Düzeltme Dozu (({calcGlucose} - {settings.targetGlucose}) / {settings.isf}):</span>
                  <strong className="text-cyan-400 font-mono">{correctionDose > 0 ? `+${correctionDose.toFixed(2)} U` : '0 U'}</strong>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-sm">
                  <span className="font-extrabold text-white">Toplam Önerilen Bolus Dozu:</span>
                  <span className="text-2xl font-black text-teal-300 font-mono">{totalRecommendedBolus} Ünite</span>
                </div>
              </div>

              {/* Save Calculation Button */}
              <button
                onClick={() => handleConfirmSaveParsed({
                  glucose: calcGlucose,
                  insulinUnits: parseFloat(totalRecommendedBolus),
                  insulinType: 'bolus',
                  carbs: calcCarbs,
                  notes: `Akıllı Bolus Hesabı ile yapıldı (Karb: ${calcCarbs}g, KŞ: ${calcGlucose})`
                })}
                className="w-full py-3 bg-gradient-to-r from-teal-500 via-cyan-500 to-indigo-500 text-slate-950 font-black text-sm rounded-xl shadow-xl hover:from-teal-400 hover:to-indigo-400 transition-all flex items-center justify-center space-x-2"
              >
                <CheckCircle2 className="w-5 h-5 text-slate-950" />
                <span>Bu Bolus Dozunu Günlüğe Kaydet ({totalRecommendedBolus} U)</span>
              </button>
            </div>
          )}

          {/* TAB 3: FOOD MEAL ANALYZER */}
          {activeTab === 'food' && (
            <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
              
              {/* Image Picker Dropzone */}
              <div className="border-2 border-dashed border-slate-800 hover:border-teal-500/50 bg-slate-950/60 p-6 rounded-2xl text-center space-y-3 relative group transition-all">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />

                {imagePreview ? (
                  <div className="relative w-full max-h-48 rounded-xl overflow-hidden border border-slate-700">
                    <img src={imagePreview} alt="Yemek Tabağı" className="w-full h-full object-cover" />
                    <button
                      onClick={(e) => { e.stopPropagation(); setImagePreview(null); setSelectedImage(null); }}
                      className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black text-white rounded-full transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto text-teal-400 border border-slate-800">
                      <Camera className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-200">Yemek Fotoğrafı Yükleyin veya Çekin</h4>
                      <p className="text-xs text-slate-400 mt-1">Sürükleyip bırakın veya cihazınızdan resim seçin</p>
                    </div>
                  </>
                )}
              </div>

              {/* Action Button */}
              {imagePreview && (
                <button
                  onClick={handleAnalyzeFood}
                  disabled={isAnalyzingFood}
                  className="w-full py-3 bg-gradient-to-r from-teal-500 via-cyan-500 to-indigo-500 text-slate-950 font-black text-sm rounded-xl shadow-xl hover:from-teal-400 hover:to-indigo-400 transition-all flex items-center justify-center space-x-2"
                >
                  {isAnalyzingFood ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Gemini AI Tabağı Analiz Ediyor...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 text-slate-950" />
                      <span>Karbonhidrat Miktarını Analiz Et</span>
                    </>
                  )}
                </button>
              )}

              {/* Food Analysis Result Card */}
              {foodAnalysisResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-4 shadow-xl"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h4 className="font-bold text-sm text-teal-300 flex items-center space-x-2">
                      <Utensils className="w-4 h-4 text-amber-400" />
                      <span>Tespit Edilen Besinler & Karbonhidrat</span>
                    </h4>
                    <span className="text-xs font-black text-amber-400 bg-amber-950 px-2.5 py-1 rounded-full border border-amber-800">
                      Toplam: {foodAnalysisResult.totalCarbs}g Karbonhidrat
                    </span>
                  </div>

                  {/* Food Items Breakdown List */}
                  <div className="space-y-2 text-xs">
                    {foodAnalysisResult.foodItems?.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-900/80 rounded-xl border border-slate-800">
                        <div>
                          <span className="font-semibold text-slate-200">{item.name}</span>
                          <span className="text-slate-400 text-[10px] ml-2">({item.portion})</span>
                        </div>
                        <span className="font-bold text-amber-400">~{item.carbs}g Karb</span>
                      </div>
                    ))}
                  </div>

                  {/* Recommended Bolus Estimate */}
                  <div className="bg-cyan-950/60 border border-cyan-800/60 p-3 rounded-xl text-xs text-cyan-200 flex items-center justify-between">
                    <span>💡 Önerilen Bolus İnsülin Tahmini:</span>
                    <strong className="text-cyan-300 font-extrabold">{foodAnalysisResult.recommendedBolusEstimate}</strong>
                  </div>

                  {/* AI Advice */}
                  {foodAnalysisResult.advice && (
                    <p className="text-xs text-slate-400 italic bg-slate-900/50 p-3 rounded-xl border border-slate-800">
                      "{foodAnalysisResult.advice}"
                    </p>
                  )}

                  {/* Save Meal to Log */}
                  <button
                    onClick={() => handleConfirmSaveParsed({ carbs: foodAnalysisResult.totalCarbs, mealType: 'Öğün', notes: 'Yemek fotoğrafı analizi ile eklendi' })}
                    className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2"
                  >
                    <CheckCircle2 className="w-5 h-5 text-slate-950" />
                    <span>Bu Karbonhidrat Değerini Günlüğe Ekle</span>
                  </button>
                </motion.div>
              )}

            </div>
          )}

          {/* TAB 4: AI DIABETES CHAT */}
          {activeTab === 'chat' && (
            <div className="p-4 flex flex-col h-[480px] flex-1">
              
              {/* Chat Messages History */}
              <div className="flex-1 overflow-y-auto space-y-3 p-2 custom-scrollbar">
                {chatMessages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] rounded-3xl p-4 text-xs leading-relaxed relative group ${
                      msg.sender === 'user'
                        ? 'bg-gradient-to-r from-teal-500 via-cyan-500 to-indigo-500 text-slate-950 font-semibold rounded-br-none shadow-lg'
                        : 'bg-slate-950/90 border border-slate-800 text-slate-200 rounded-bl-none shadow-md space-y-1.5 backdrop-blur-md'
                    }`}>
                      <div className="flex items-center justify-between opacity-70 text-[10px] mb-1">
                        <div className="flex items-center space-x-1.5">
                          {msg.sender === 'ai' ? (
                            <img src="/dia_ai_avatar.png" className="w-4 h-4 rounded-full" alt="" />
                          ) : (
                            <User className="w-3 h-3" />
                          )}
                          <span className="font-bold">{msg.sender === 'ai' ? 'DiaAI Medikal Asistan' : 'Siz'}</span>
                        </div>
                        <span>{msg.timestamp}</span>
                      </div>
                      
                      <div className="whitespace-pre-line">{msg.text}</div>

                      {/* Copy Button */}
                      {msg.sender === 'ai' && (
                        <button
                          onClick={() => handleCopy(msg.text, index)}
                          className="absolute right-2 top-2 p-1 text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 rounded-md"
                          title="Kopyala"
                        >
                          {copiedIndex === index ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {isSendingChat && (
                  <div className="flex justify-start">
                    <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl text-xs text-slate-400 flex items-center space-x-2">
                      <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
                      <span>DiaAI parametrelerinizi ve tıbbi protokolleri inceliyor...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Quick Questions Suggestions */}
              <div className="flex items-center space-x-2 py-2 overflow-x-auto custom-scrollbar text-[11px]">
                {[
                  'Şafak Fenomeni ve Somogyi etkisi farkı nedir?',
                  'Spor öncesi insülinimi nasıl ayarlamalıyım?',
                  'Gece hipoglisemisinden korunma yolları'
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSendChat(q)}
                    className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded-full border border-slate-800 shrink-0 transition-colors font-medium"
                  >
                    {q}
                  </button>
                ))}
              </div>

              {/* Chat Input Bar */}
              <div className="pt-2 flex items-center space-x-2 border-t border-slate-800">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                  placeholder="DiaAI asistanınıza bir soru sorun..."
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl py-3 px-4 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                />
                <button
                  onClick={() => handleSendChat()}
                  disabled={isSendingChat || !chatInput.trim()}
                  className="p-3 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 disabled:opacity-50 text-slate-950 rounded-2xl font-bold transition-all shadow-md"
                >
                  <Send className="w-4 h-4 text-slate-950" />
                </button>
              </div>

            </div>
          )}

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
