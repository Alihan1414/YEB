'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  RefreshCw, BookOpen, Star, Heart, Sun, Moon,
  ChevronLeft, Maximize, Minimize, Sparkles, User, Users, Home, Award, CheckCircle2, ShieldAlert,
  Utensils, Coffee, Volume2, VolumeX, Radio, Activity, Music, Sliders
} from 'lucide-react';

// Dönen Hadis-i Şerifler
const HADITHS = [
  {
    text: "Bir topluluk Allah'ın evlerinden bir evde toplanır, Allah'ın kitabını okur ve onu aralarında müzakere ederlerse, üzerlerine sekîne iner, onları rahmet kaplar, melekler etraflarını kuşatır.",
    source: "Müslim, Zikir 38"
  },
  {
    text: "İlim öğrenmek her Müslümana farzdır.",
    source: "İbn Mâce, Mukaddime 17"
  },
  {
    text: "Sizin en hayırlınız Kur'an'ı öğrenen ve öğretendir.",
    source: "Buhârî, Fezâilü'l-Kur'ân 21"
  },
  {
    text: "Güzel ahlakı tamamlamak üzere gönderildim.",
    source: "Muvatta, Hüsnü'l-Huluk 8"
  },
  {
    text: "Mümin, diğer müminlere binânın tuğlaları gibidir; birbirini sağlamlaştırır.",
    source: "Buhârî, Salât 88"
  }
];

// Dönen motivasyon sözleri
const MOTTOS = [
  { title: "İyilikte, bilgide ve sabırla ilerleyin.", sub: "Günün her anı değerli ve bereketli olsun." },
  { title: "Öğrenmek ibadet, öğretmek sadakadır.", sub: "Her gün yeni bir adım, yeni bir ufuk." },
  { title: "Sabır ve azimle her zirve aşılır.", sub: "Başarmak için samimiyetle azmetmek kâfidir." },
  { title: "Kalpler ancak Allah'ın zikriyle huzur bulur.", sub: "Gününüz huzur ve feyizle dolsun." },
  { title: "İlim öğrenmek beşikten mezara kadardır.", sub: "Öğrenmeye ve gayrete asla ara verme." }
];

// ─── Huzur Veren Akustik Fon Sesi Motoru (Tasavvufi Ney & Şadırvan Su Şırıltısı) ───
class PeacefulHuzurEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.isPlaying = false;
    this.mode = 'ilahi'; // 'ilahi' | 'ney' | 'water'
    this.volume = 0.30;
    this.activeNodes = [];
    this.melodyTimer = null;
    this.dropletTimer = null;
    this.reverbIn = null;
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
  }

  setMode(newMode) {
    this.mode = newMode;
    if (this.isPlaying) {
      this.stop();
      setTimeout(() => this.start(newMode), 350);
    }
  }

  start(modeOverride) {
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    if (this.isPlaying) return;
    this.isPlaying = true;
    if (modeOverride) this.mode = modeOverride;

    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(0.0001, now);
    this.masterGain.gain.exponentialRampToValueAtTime(this.volume, now + 2.0);

    // Kubbe Akustiği / Reverb Alanı Kurulumu
    this.setupReverb();

    if (this.mode === 'ilahi') {
      // 🕊️ İLAHİ MODU: Tale'al Bedru & Salat-ı Ümmiye Koro Formantları + Ney & Zikir Demi
      this.startSufiDem(0.025);
      this.startWaterStream(false, 0.008);
      this.startIlahiChoir();
      this.startNeyAccompaniment();
    } else if (this.mode === 'ney') {
      // 🌿 NEY MODU: Akustik Ney Taksimi & Şadırvan Suyu
      this.startSufiDem(0.03);
      this.startWaterStream(false, 0.015);
      this.startNeyMelody();
    } else {
      // 💧 DOĞA MODU: Dingin Akarsu & Kuş Sesleri
      this.startWaterStream(true, 0.025);
      this.startGentleBirds();
      this.startSufiDem(0.012);
    }
  }

  setupReverb() {
    const delayL = this.ctx.createDelay();
    const delayR = this.ctx.createDelay();
    delayL.delayTime.setValueAtTime(0.38, this.ctx.currentTime);
    delayR.delayTime.setValueAtTime(0.54, this.ctx.currentTime);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1100, this.ctx.currentTime);

    const feedback = this.ctx.createGain();
    feedback.gain.setValueAtTime(0.42, this.ctx.currentTime);

    const wetGain = this.ctx.createGain();
    wetGain.gain.setValueAtTime(0.5, this.ctx.currentTime);

    delayL.connect(delayR);
    delayR.connect(filter);
    filter.connect(feedback);
    feedback.connect(delayL);
    filter.connect(wetGain);
    wetGain.connect(this.masterGain);

    this.reverbIn = delayL;
    this.activeNodes.push(delayL, delayR, filter, feedback, wetGain);
  }

  // Akustik Dem (Derin ve dinlendirici Re/La kök tınısı)
  startSufiDem(gainVal = 0.03) {
    const notes = [73.42, 110, 146.83, 220]; // D2, A2, D3, A3
    const demFilter = this.ctx.createBiquadFilter();
    demFilter.type = 'lowpass';
    demFilter.frequency.setValueAtTime(260, this.ctx.currentTime);

    const demGain = this.ctx.createGain();
    demGain.gain.setValueAtTime(gainVal, this.ctx.currentTime);

    demFilter.connect(demGain);
    demGain.connect(this.masterGain);
    if (this.reverbIn) demGain.connect(this.reverbIn);

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq + (idx * 0.15 - 0.2), this.ctx.currentTime);
      osc.connect(demFilter);
      osc.start();
      this.activeNodes.push(osc);
    });
  }

  // Dingin Şadırvan & Su Şırıltısı
  startWaterStream(isFull = false, baseVol = 0.016) {
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = output[i];
      output[i] *= 2.8;
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    const waterFilter = this.ctx.createBiquadFilter();
    waterFilter.type = 'bandpass';
    waterFilter.frequency.setValueAtTime(620, this.ctx.currentTime);
    waterFilter.Q.setValueAtTime(1.8, this.ctx.currentTime);

    const waterLfo = this.ctx.createOscillator();
    const waterLfoGain = this.ctx.createGain();
    waterLfo.frequency.setValueAtTime(0.25, this.ctx.currentTime);
    waterLfoGain.gain.setValueAtTime(140, this.ctx.currentTime);
    waterLfo.connect(waterLfoGain);
    waterLfoGain.connect(waterFilter.frequency);
    waterLfo.start();

    const waterGain = this.ctx.createGain();
    waterGain.gain.setValueAtTime(isFull ? baseVol * 1.5 : baseVol, this.ctx.currentTime);

    noiseSource.connect(waterFilter);
    waterFilter.connect(waterGain);
    waterGain.connect(this.masterGain);

    noiseSource.start();
    this.activeNodes.push(noiseSource, waterLfo, waterLfoGain, waterFilter, waterGain);

    // Rastgele hafif şadırvan su damlacıkları
    const playDroplet = () => {
      if (!this.isPlaying || !this.ctx) return;
      const dropFreq = 780 + Math.random() * 550;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(dropFreq, now);
      osc.frequency.exponentialRampToValueAtTime(dropFreq * 1.5, now + 0.04);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.014, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

      osc.connect(gain);
      gain.connect(this.masterGain);
      if (this.reverbIn) gain.connect(this.reverbIn);

      osc.start(now);
      osc.stop(now + 0.1);
    };

    this.dropletTimer = setInterval(() => {
      if (Math.random() > 0.35) playDroplet();
    }, 1300);
  }

  // Tasavvufi Ney Nefesi ve Melodisi (Rast / Uşşak Tınısı)
  startNeyMelody() {
    const phrases = [
      [293.66, 329.63, 349.23, 329.63, 293.66],
      [349.23, 392.00, 440.00, 392.00, 349.23, 329.63],
      [440.00, 493.88, 523.25, 493.88, 440.00],
      [392.00, 349.23, 329.63, 293.66]
    ];
    let phraseIdx = 0;

    const playNeyPhrase = () => {
      if (!this.isPlaying || !this.ctx || this.mode !== 'ney') return;
      const phrase = phrases[phraseIdx % phrases.length];
      phraseIdx++;

      let startTime = this.ctx.currentTime + 0.4;
      phrase.forEach((freq, noteIdx) => {
        const noteDuration = 2.4 + (noteIdx === phrase.length - 1 ? 1.4 : 0);
        const now = startTime;

        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        // İnce ney vibratosu
        const vibrato = this.ctx.createOscillator();
        const vibratoGain = this.ctx.createGain();
        vibrato.frequency.setValueAtTime(4.2, now);
        vibratoGain.gain.setValueAtTime(1.8, now);
        vibrato.connect(vibratoGain);
        vibratoGain.connect(osc.frequency);
        vibrato.start(now);
        vibrato.stop(now + noteDuration);

        // Nefes açılış ve kapanış zarfı
        const noteGain = this.ctx.createGain();
        noteGain.gain.setValueAtTime(0.0001, now);
        noteGain.gain.linearRampToValueAtTime(0.042, now + 0.7);
        noteGain.gain.setValueAtTime(0.042, now + noteDuration - 0.6);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, now + noteDuration);

        osc.connect(noteGain);
        noteGain.connect(this.masterGain);
        if (this.reverbIn) noteGain.connect(this.reverbIn);

        osc.start(now);
        osc.stop(now + noteDuration);

        startTime += noteDuration - 0.25;
      });

      const totalPhraseTime = (startTime - this.ctx.currentTime) * 1000;
      this.melodyTimer = setTimeout(playNeyPhrase, totalPhraseTime + 5500);
    };

    setTimeout(playNeyPhrase, 1800);
  }

  // 🕊️ Tasavvufi İlahi Korosu (Tale'al Bedru & Salat-ı Ümmiye Vokal Formantları)
  startIlahiChoir() {
    const ilahiSongs = [
      // 1. Tale'al Bedru 'Alayna (طَلَعَ البَدْرُ عَلَيْنَا)
      [
        { f: 293.66, d: 1.1 }, { f: 293.66, d: 0.6 }, { f: 369.99, d: 0.8 }, { f: 440.00, d: 1.5 },
        { f: 440.00, d: 0.6 }, { f: 493.88, d: 0.8 }, { f: 440.00, d: 2.4 }, // Tale'al bedru 'aleyna...
        { f: 392.00, d: 0.8 }, { f: 369.99, d: 0.8 }, { f: 329.63, d: 0.8 }, { f: 369.99, d: 0.8 },
        { f: 392.00, d: 0.8 }, { f: 369.99, d: 0.8 }, { f: 329.63, d: 0.8 }, { f: 293.66, d: 2.6 }, // Min seniyyetil veda'...
        { f: 369.99, d: 0.8 }, { f: 440.00, d: 0.8 }, { f: 493.88, d: 1.2 }, { f: 493.88, d: 0.6 },
        { f: 440.00, d: 0.8 }, { f: 493.88, d: 0.8 }, { f: 440.00, d: 2.4 }, // Vecebeş-şükrü 'aleyna...
        { f: 392.00, d: 0.8 }, { f: 369.99, d: 0.8 }, { f: 329.63, d: 0.8 }, { f: 369.99, d: 0.8 },
        { f: 329.63, d: 1.1 }, { f: 293.66, d: 3.0 } // Ma dea lillahi da'...
      ],
      // 2. Salat-ı Ümmiye (Itri - Allâhumme salli 'alâ seyyidinâ Muhammed)
      [
        { f: 293.66, d: 1.2 }, { f: 329.63, d: 0.8 }, { f: 369.99, d: 1.2 }, { f: 392.00, d: 1.4 },
        { f: 369.99, d: 0.9 }, { f: 329.63, d: 1.0 }, { f: 293.66, d: 2.6 }, // Allahümme salli alâ...
        { f: 369.99, d: 1.0 }, { f: 392.00, d: 0.9 }, { f: 440.00, d: 1.6 }, { f: 392.00, d: 0.9 },
        { f: 369.99, d: 1.0 }, { f: 329.63, d: 2.4 }, // Seyyidinâ Muhammedin...
        { f: 329.63, d: 1.0 }, { f: 369.99, d: 1.0 }, { f: 392.00, d: 1.2 }, { f: 369.99, d: 0.9 },
        { f: 329.63, d: 1.1 }, { f: 293.66, d: 3.2 } // Ve ala alihi ve sahbihi ve sellim...
      ]
    ];

    let songIdx = 0;

    const playIlahiCycle = () => {
      if (!this.isPlaying || !this.ctx || this.mode !== 'ilahi') return;
      const song = ilahiSongs[songIdx % ilahiSongs.length];
      songIdx++;

      let startTime = this.ctx.currentTime + 0.4;

      song.forEach((item) => {
        const { f: freq, d: duration } = item;
        const now = startTime;

        // Vokal Formantı (Hûû / Ooh Koro Tınısı)
        const voiceOsc = this.ctx.createOscillator();
        voiceOsc.type = 'triangle';
        voiceOsc.frequency.setValueAtTime(freq, now);

        const vibrato = this.ctx.createOscillator();
        const vibratoGain = this.ctx.createGain();
        vibrato.frequency.setValueAtTime(4.6, now);
        vibratoGain.gain.setValueAtTime(1.8, now);
        vibrato.connect(vibratoGain);
        vibratoGain.connect(voiceOsc.frequency);
        vibrato.start(now);
        vibrato.stop(now + duration);

        const f1 = this.ctx.createBiquadFilter();
        f1.type = 'bandpass';
        f1.frequency.setValueAtTime(380, now);
        f1.Q.setValueAtTime(3.2, now);

        const f2 = this.ctx.createBiquadFilter();
        f2.type = 'bandpass';
        f2.frequency.setValueAtTime(880, now);
        f2.Q.setValueAtTime(4.5, now);

        const voiceGain = this.ctx.createGain();
        voiceGain.gain.setValueAtTime(0.0001, now);
        voiceGain.gain.linearRampToValueAtTime(0.038, now + 0.32);
        voiceGain.gain.setValueAtTime(0.038, now + duration - 0.4);
        voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        voiceOsc.connect(f1);
        voiceOsc.connect(f2);
        f1.connect(voiceGain);
        f2.connect(voiceGain);

        voiceGain.connect(this.masterGain);
        if (this.reverbIn) voiceGain.connect(this.reverbIn);

        voiceOsc.start(now);
        voiceOsc.stop(now + duration);

        // Koro İkinci Sesi (Armonik Oktav Desteği)
        const harmOsc = this.ctx.createOscillator();
        harmOsc.type = 'sine';
        harmOsc.frequency.setValueAtTime(freq * 0.5, now);

        const harmGain = this.ctx.createGain();
        harmGain.gain.setValueAtTime(0.0001, now);
        harmGain.gain.linearRampToValueAtTime(0.016, now + 0.35);
        harmGain.gain.setValueAtTime(0.016, now + duration - 0.35);
        harmGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        harmOsc.connect(harmGain);
        harmGain.connect(this.masterGain);
        if (this.reverbIn) harmGain.connect(this.reverbIn);

        harmOsc.start(now);
        harmOsc.stop(now + duration);

        startTime += duration - 0.12;
      });

      const totalTime = (startTime - this.ctx.currentTime) * 1000;
      this.melodyTimer = setTimeout(playIlahiCycle, totalTime + 4000);
    };

    setTimeout(playIlahiCycle, 1200);
  }

  // İlahi eşliğindeki hafif Ney taksimi
  startNeyAccompaniment() {
    const neyNotes = [293.66, 369.99, 440.00, 392.00, 329.63, 293.66];
    let nIdx = 0;

    const playNeyNote = () => {
      if (!this.isPlaying || !this.ctx || this.mode !== 'ilahi') return;
      const freq = neyNotes[nIdx % neyNotes.length];
      nIdx++;
      const now = this.ctx.currentTime;
      const dur = 3.6;

      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      const vib = this.ctx.createOscillator();
      const vibG = this.ctx.createGain();
      vib.frequency.setValueAtTime(4.2, now);
      vibG.gain.setValueAtTime(1.5, now);
      vib.connect(vibG);
      vibG.connect(osc.frequency);
      vib.start(now);
      vib.stop(now + dur);

      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(0.014, now + 0.8);
      g.gain.setValueAtTime(0.014, now + dur - 0.8);
      g.gain.exponentialRampToValueAtTime(0.0001, now + dur);

      osc.connect(g);
      g.connect(this.masterGain);
      if (this.reverbIn) g.connect(this.reverbIn);

      osc.start(now);
      osc.stop(now + dur);

      setTimeout(playNeyNote, 8500 + Math.random() * 4000);
    };

    setTimeout(playNeyNote, 3000);
  }

  startGentleBirds() {
    const playChirp = () => {
      if (!this.isPlaying || !this.ctx || this.mode !== 'water') return;
      const now = this.ctx.currentTime;
      const birdOsc = this.ctx.createOscillator();
      const birdGain = this.ctx.createGain();

      const baseF = 2400 + Math.random() * 700;
      birdOsc.type = 'sine';
      birdOsc.frequency.setValueAtTime(baseF, now);
      birdOsc.frequency.exponentialRampToValueAtTime(baseF * 1.3, now + 0.05);
      birdOsc.frequency.exponentialRampToValueAtTime(baseF * 0.9, now + 0.11);

      birdGain.gain.setValueAtTime(0.0001, now);
      birdGain.gain.linearRampToValueAtTime(0.007, now + 0.02);
      birdGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);

      birdOsc.connect(birdGain);
      birdGain.connect(this.masterGain);
      if (this.reverbIn) birdGain.connect(this.reverbIn);

      birdOsc.start(now);
      birdOsc.stop(now + 0.14);
    };

    const scheduleBird = () => {
      if (!this.isPlaying || this.mode !== 'water') return;
      playChirp();
      if (Math.random() > 0.5) setTimeout(playChirp, 180);
      setTimeout(scheduleBird, 4500 + Math.random() * 6000);
    };
    setTimeout(scheduleBird, 2500);
  }

  startDeepChimes() {
    const chimes = [220, 277.18, 329.63, 440, 554.37];
    const playChime = () => {
      if (!this.isPlaying || !this.ctx || this.mode !== 'dome') return;
      const freq = chimes[Math.floor(Math.random() * chimes.length)];
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.022, now + 0.4);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 6.0);

      osc.connect(gain);
      gain.connect(this.masterGain);
      if (this.reverbIn) gain.connect(this.reverbIn);

      osc.start(now);
      osc.stop(now + 6.5);
    };

    const loop = () => {
      if (!this.isPlaying || this.mode !== 'dome') return;
      playChime();
      setTimeout(loop, 6000 + Math.random() * 4000);
    };
    setTimeout(loop, 1500);
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.linearRampToValueAtTime(this.volume, this.ctx.currentTime + 0.1);
    }
  }

  stop() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    if (this.melodyTimer) clearTimeout(this.melodyTimer);
    if (this.dropletTimer) clearInterval(this.dropletTimer);

    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.linearRampToValueAtTime(0.0001, now + 0.7);
      setTimeout(() => {
        this.activeNodes.forEach(node => {
          try { node.stop(); } catch(e) {}
          try { node.disconnect(); } catch(e) {}
        });
        this.activeNodes = [];
      }, 800);
    }
  }
}

// Gece / Akşam Kayan Yıldızlar
function Particles({ isNight }) {
  const particles = useMemo(
    () =>
      Array.from({ length: 70 }, (_, i) => ({
        id: i,
        x: ((i * 37) % 95) + 2,
        y: ((i * 23) % 60) + 2,
        size: (i % 3) * 0.8 + 1.2,
        duration: (i % 5) + 3,
        delay: (i % 4) * 1.2,
        opacity: ((i % 7) + 3) / 10,
      })),
    []
  );

  if (!isNight) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            opacity: p.opacity,
            animation: `twinkle ${p.duration}s ease-in-out ${p.delay}s infinite alternate`,
          }}
        />
      ))}
      <div className="shooting-star-1" />
      <div className="shooting-star-2" />
    </div>
  );
}

// Canlı Saat Bileşeni
function Clock() {
  const [time, setTime] = useState(null);
  useEffect(() => {
    setTime(new Date());
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!time) return <div className="h-16 w-36" />;

  return (
    <div className="text-right">
      <div className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight tabular-nums flex items-baseline justify-end drop-shadow-[0_4px_25px_rgba(0,0,0,0.8)]">
        <span>{time.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
        <span className="text-amber-400 text-2xl md:text-3xl ml-1 font-bold">:{String(time.getSeconds()).padStart(2, '0')}</span>
      </div>
      <div className="text-slate-200 text-xs md:text-sm mt-0.5 font-bold tracking-wide">
        {time.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' })}
      </div>
    </div>
  );
}

// Akıcı Sayı Sayacı
function AnimatedCounter({ value }) {
  const [display, setDisplay] = useState(value || 0);

  useEffect(() => {
    const startVal = display;
    const endVal = value || 0;
    if (startVal === endVal) return;

    const diff = endVal - startVal;
    let stepCount = 0;
    const totalSteps = 20;

    const t = setInterval(() => {
      stepCount++;
      if (stepCount >= totalSteps) {
        setDisplay(endVal);
        clearInterval(t);
      } else {
        setDisplay(Math.round(startVal + (diff * (stepCount / totalSteps))));
      }
    }, 30);

    return () => clearInterval(t);
  }, [value]);

  return <>{display}</>;
}

// Gerçek Zamanlı Gökyüzü Hesabı
function useSunPosition() {
  const [skyData, setSkyData] = useState({
    isNight: false,
    skyGradient: 'linear-gradient(180deg, #030a1a 0%, #061533 35%, #09204c 70%, #0b2b66 100%)',
    phaseName: 'Gündüz',
  });

  useEffect(() => {
    const calculate = () => {
      const hours = new Date().getHours();
      let isNight = false;
      let phaseName = 'Gündüz (Eğitim Vakti)';
      let skyGradient = 'linear-gradient(180deg, #030b1e 0%, #06173d 35%, #08245c 70%, #0c337c 100%)';

      if (hours >= 5 && hours < 8) {
        phaseName = 'Gün Doğumu (Şafak Vakti)';
        skyGradient = 'linear-gradient(180deg, #070a14 0%, #171638 25%, #34120a 55%, #7c2d12 80%, #c2410c 100%)';
      } else if (hours >= 8 && hours < 17) {
        phaseName = 'Gündüz (Eğitim Vakti)';
        skyGradient = 'linear-gradient(180deg, #030c22 0%, #061a45 35%, #092864 70%, #0c3886 100%)';
      } else if (hours >= 17 && hours < 20) {
        phaseName = 'Gün Batımı (Akşam Kızıllığı)';
        skyGradient = 'linear-gradient(180deg, #04060d 0%, #150d2e 25%, #2a0b36 50%, #581c87 75%, #9a3412 100%)';
      } else {
        phaseName = 'Gece (İstanbul Mehtabı)';
        isNight = true;
        skyGradient = 'linear-gradient(180deg, #01040d 0%, #030818 35%, #050d26 70%, #071338 100%)';
      }

      setSkyData({ isNight, skyGradient, phaseName });
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, []);

  return skyData;
}

// Birebir İstanbul Silueti SVG
function IstanbulSilhouetteSVG() {
  return (
    <div className="absolute top-0 left-0 right-0 h-44 pointer-events-none z-0 overflow-hidden opacity-30">
      <svg viewBox="0 0 1440 220" className="w-full h-full preserve-3d" preserveAspectRatio="none">
        <path d="M 0,110 Q 720,-20 1440,110" fill="none" stroke="rgba(56,189,248,0.4)" strokeWidth="1.5" />
        <g fill="none" stroke="rgba(147,197,253,0.35)" strokeWidth="1.2">
          <path d="M 500,160 Q 530,120 560,160" />
          <line x1="490" y1="160" x2="490" y2="90" />
          <line x1="570" y1="160" x2="570" y2="90" />
          <path d="M 487,90 L 490,75 L 493,90" fill="rgba(147,197,253,0.35)" />
          <path d="M 567,90 L 570,75 L 573,90" fill="rgba(147,197,253,0.35)" />
          <path d="M 750,150 Q 790,95 830,150" strokeWidth="1.5" />
          <line x1="735" y1="150" x2="735" y2="60" strokeWidth="1.5" />
          <line x1="845" y1="150" x2="845" y2="60" strokeWidth="1.5" />
          <path d="M 732,60 L 735,40 L 738,60" fill="rgba(147,197,253,0.4)" />
          <path d="M 842,60 L 845,40 L 848,60" fill="rgba(147,197,253,0.4)" />
        </g>
        <g stroke="rgba(56,189,248,0.4)" strokeWidth="1.2" fill="none">
          <line x1="980" y1="180" x2="980" y2="65" />
          <line x1="990" y1="180" x2="990" y2="65" />
          <line x1="975" y1="85" x2="995" y2="85" />
          <line x1="975" y1="125" x2="995" y2="125" />
          <line x1="1220" y1="180" x2="1220" y2="65" />
          <line x1="1230" y1="180" x2="1230" y2="65" />
          <line x1="1215" y1="85" x2="1235" y2="85" />
          <line x1="1215" y1="125" x2="1235" y2="125" />
          <path d="M 880,140 Q 985,80 1105,115 Q 1225,80 1330,140" strokeWidth="1.5" />
          <line x1="1020" y1="95" x2="1020" y2="140" strokeDasharray="2 3" />
          <line x1="1060" y1="108" x2="1060" y2="140" strokeDasharray="2 3" />
          <line x1="1105" y1="115" x2="1105" y2="140" strokeDasharray="2 3" />
          <line x1="1150" y1="108" x2="1150" y2="140" strokeDasharray="2 3" />
          <line x1="1190" y1="95" x2="1190" y2="140" strokeDasharray="2 3" />
        </g>
      </svg>
    </div>
  );
}

function TVContent() {
  const auth = useAuth() || {};
  const { user, authLoading, institutionId, institutionName, logoUrl } = auth;
  const router = useRouter();

  const [students, setStudents]           = useState([]);
  const [teachersCount, setTeachersCount] = useState(0);
  const [classesCount, setClassesCount]   = useState(0);
  const [reports, setReports]             = useState([]);
  const [attendanceRate, setAttendanceRate] = useState(100);
  const [foodMenu, setFoodMenu]           = useState(null);
  const [activeRightTab, setActiveRightTab] = useState('menu'); // 'menu' | 'reports' | 'motto'
  const [loading, setLoading]             = useState(true);
  const [lastRefresh, setLastRefresh]     = useState(new Date());
  const [hadithIdx, setHadithIdx]         = useState(0);
  const [mottoIdx, setMottoIdx]           = useState(0);
  const [reportIdx, setReportIdx]         = useState(0);
  const [hadithVisible, setHadithVisible] = useState(true);
  const [isFullscreen, setIsFullscreen]   = useState(false);
  const [isMounted, setIsMounted]         = useState(false);
  const [isMobile, setIsMobile]           = useState(false);

  // Dinlendirici Huzur & Özel TV Fon Sesi Durumları
  const [isAudioPlaying, setIsAudioPlaying]     = useState(false);
  const [audioVolume, setAudioVolume]           = useState(0.30);
  const [soundMode, setSoundMode]               = useState('ilahi'); // 'custom' | 'ilahi' | 'ney' | 'water'
  const [customAudio, setCustomAudio]           = useState(null);
  const [showVolumePopup, setShowVolumePopup]   = useState(false);
  const [showAudioBanner, setShowAudioBanner]   = useState(false);
  const audioEngineRef = useRef(null);
  const customAudioRef = useRef(null);

  useEffect(() => {
    setIsMounted(true);
    audioEngineRef.current = new PeacefulHuzurEngine();

    const checkMobile = () => {
      const mobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        || window.innerWidth < 900;
      setIsMobile(mobile);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
      if (audioEngineRef.current) {
        audioEngineRef.current.stop();
      }
      if (customAudioRef.current) {
        customAudioRef.current.pause();
      }
    };
  }, []);

  // Audio Toggle
  const toggleAudio = useCallback(() => {
    if (isAudioPlaying) {
      if (customAudioRef.current) customAudioRef.current.pause();
      if (audioEngineRef.current) audioEngineRef.current.stop();
      setIsAudioPlaying(false);
    } else {
      if (soundMode === 'custom' && customAudio && customAudioRef.current) {
        if (audioEngineRef.current) audioEngineRef.current.stop();
        customAudioRef.current.volume = audioVolume;
        customAudioRef.current.play().catch(e => console.log('Custom audio autoplay error:', e));
      } else if (audioEngineRef.current) {
        if (customAudioRef.current) customAudioRef.current.pause();
        audioEngineRef.current.setVolume(audioVolume);
        audioEngineRef.current.start(soundMode === 'custom' ? 'ilahi' : soundMode);
      }
      setIsAudioPlaying(true);
      setShowAudioBanner(false);
    }
  }, [isAudioPlaying, audioVolume, soundMode, customAudio]);

  const handleVolumeChange = (newVal) => {
    setAudioVolume(newVal);
    if (customAudioRef.current) {
      customAudioRef.current.volume = newVal;
    }
    if (audioEngineRef.current) {
      audioEngineRef.current.setVolume(newVal);
    }
  };

  const handleSoundModeChange = (newMode) => {
    setSoundMode(newMode);
    if (isAudioPlaying) {
      if (newMode === 'custom' && customAudio && customAudioRef.current) {
        if (audioEngineRef.current) audioEngineRef.current.stop();
        customAudioRef.current.volume = audioVolume;
        customAudioRef.current.play().catch(e => console.log(e));
      } else {
        if (customAudioRef.current) customAudioRef.current.pause();
        if (audioEngineRef.current) {
          audioEngineRef.current.setMode(newMode);
          audioEngineRef.current.start(newMode);
        }
      }
    }
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  // ── Hadis / Motto / Menü / Rapor rotasyonu (Her 12 saniyede bir) ──
  useEffect(() => {
    const interval = setInterval(() => {
      setHadithVisible(false);
      setTimeout(() => {
        setHadithIdx(i => (i + 1) % HADITHS.length);
        setMottoIdx(i => (i + 1) % MOTTOS.length);
        setReportIdx(i => i + 1);
        setActiveRightTab(prev => {
          if (prev === 'menu') return 'reports';
          if (prev === 'reports') return 'motto';
          return 'menu';
        });
        setHadithVisible(true);
      }, 500);
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  // ── Veri çekme (Canlı Otomatik Senkronizasyon) ──
  const fetchData = useCallback(async () => {
    const instId = institutionId || 'bolu-kilicaslan';
    try {
      const [sRes, rRes, tRes, lRes, mRes, aRes] = await Promise.all([
        fetch(`/api/students?institutionId=${encodeURIComponent(instId)}`, { cache: 'no-store' }),
        fetch(`/api/students/reports?institutionId=${encodeURIComponent(instId)}`, { cache: 'no-store' }),
        fetch(`/api/users/list-teachers?institutionId=${encodeURIComponent(instId)}`, { cache: 'no-store' }),
        fetch(`/api/leave?institutionId=${encodeURIComponent(instId)}`, { cache: 'no-store' }),
        fetch(`/api/food-menu?institutionId=${encodeURIComponent(instId)}`, { cache: 'no-store' }),
        fetch(`/api/tv-audio?institutionId=${encodeURIComponent(instId)}`, { cache: 'no-store' }),
      ]);
      const [sData, rData, tData, lData, mData, aData] = await Promise.all([
        sRes.json(), rRes.json(), tRes.json(), lRes.json(), mRes.json(), aRes.json()
      ]);

      let totalStudents = 0;
      if (sData.success && Array.isArray(sData.students)) {
        setStudents(sData.students);
        totalStudents = sData.students.length;
        setClassesCount(new Set(sData.students.map(s => s.class).filter(Boolean)).size);
      } else { setStudents([]); setClassesCount(0); }

      if (rData.success && Array.isArray(rData.reports)) {
        const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
        const validReports = rData.reports.filter(r => r.created_at && new Date(r.created_at) >= weekAgo);
        setReports(validReports);
      } else { setReports([]); }

      setTeachersCount(tData.success && Array.isArray(tData.teachers) ? tData.teachers.length : 0);

      if (lData.success && Array.isArray(lData.requests) && totalStudents > 0) {
        const active = lData.requests.filter(req => req.status === 'approved').length;
        setAttendanceRate(Math.round((Math.max(0, totalStudents - active) / totalStudents) * 100));
      } else { setAttendanceRate(100); }

      if (mData.success && (mData.menu || mData.currentMenu)) {
        setFoodMenu(mData.menu || mData.currentMenu);
      }

      if (aData && aData.success) {
        if (aData.audio) {
          setCustomAudio(prev => {
            if (!prev) {
              setSoundMode('custom');
            }
            return aData.audio;
          });
        } else {
          setCustomAudio(null);
          setSoundMode(prev => (prev === 'custom' ? 'ilahi' : prev));
        }
      }
      
      setLastRefresh(new Date());
    } catch (e) { 
      console.error('TV Canlı Veri Hatası:', e); 
    } finally { 
      setLoading(false); 
    }
  }, [institutionId]);

  // İlk yükleme
  useEffect(() => { fetchData(); }, [fetchData]);

  // Canlı senkronizasyon (TV ekranının güncel kalması - her 12 saniyede bir)
  useEffect(() => {
    const iv = setInterval(fetchData, 12000);
    return () => clearInterval(iv);
  }, [fetchData]);

  // 24/7 Gece Yarısı Tarih Değişimi & Sekme Uyanma Koruması
  useEffect(() => {
    let lastDay = new Date().getDate();
    const midnightWatchdog = setInterval(() => {
      const curDay = new Date().getDate();
      if (curDay !== lastDay) {
        lastDay = curDay;
        console.log('Yeni güne geçildi, TV verileri yenileniyor...');
        fetchData();
      }
    }, 20000);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchData();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(midnightWatchdog);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [fetchData]);

  // Gökyüzü Hesabı
  const skyData = useSunPosition();

  // Son Raporlar (Pozitif / Güncel Notlar)
  const recentReports = useMemo(() => {
    return [...reports]
      .filter(r => r.content && r.content.trim() !== '')
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, 10);
  }, [reports]);

  // Canlı Kayan Yazı Maddeleri (Canlı Akış Bandı)
  const tickerItems = useMemo(() => {
    if (recentReports.length > 0) {
      const mapped = recentReports.map(r => ({
        title: `${r.student_name || 'Öğrenci'} (${r.category || 'Not'}):`,
        text: `"${r.content}"`
      }));
      return [...mapped, ...mapped];
    }
    return [
      { title: "Bolu Kılıçarslan:", text: "Geleceği geçmişe bağlayan samimi ve ilkeli eğitim anlayışı." },
      { title: "Cemaat & İbadet:", text: "Vakit namazlarına iştirak ve mescid edebi en büyük bereketimizdir." },
      { title: "Ders & Etüt:", text: "Azimle çalışarak hedeflerine yürüyen tüm talebelerimize muvaffakiyetler dileriz." },
      { title: "Bolu Kılıçarslan:", text: "Geleceği geçmişe bağlayan samimi ve ilkeli eğitim anlayışı." },
      { title: "Cemaat & İbadet:", text: "Vakit namazlarına iştirak ve mescid edebi en büyük bereketimizdir." },
    ];
  }, [recentReports]);

  // ────────────────────────────────────────────────────────────
  // Early returns AFTER all hooks
  // ────────────────────────────────────────────────────────────
  if (!isMounted) {
    return (
      <div style={{ minHeight: '100vh', background: '#010818', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid rgba(251,191,36,0.3)', borderTopColor: '#fbbf24', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  // Mobile guard
  if (isMobile) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #010818 0%, #05122e 50%, #010818 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: "'Segoe UI', sans-serif",
        }}
      >
        <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                borderRadius: '50%',
                background: 'white',
                width: `${(i % 3) + 1}px`,
                height: `${(i % 3) + 1}px`,
                left: `${(i * 37) % 100}%`,
                top: `${(i * 23) % 80}%`,
                opacity: 0.3 + (i % 4) * 0.1,
                animation: `twinkle ${3 + (i % 4)}s ease-in-out infinite alternate`,
              }}
            />
          ))}
        </div>

        <div
          style={{
            position: 'relative',
            zIndex: 1,
            background: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(251,191,36,0.2)',
            borderRadius: '28px',
            padding: '48px 36px',
            maxWidth: '400px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 8px 80px rgba(0,0,0,0.6), 0 0 60px rgba(251,191,36,0.08)',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(251,191,36,0.12)',
              border: '1px solid rgba(251,191,36,0.3)',
              borderRadius: '20px',
              padding: '6px 14px',
              marginBottom: '24px',
              color: '#fbbf24',
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            <span>📡</span>
            <span>TV Modu</span>
          </div>

          <div
            style={{
              width: '88px',
              height: '88px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(251,191,36,0.05))',
              border: '2px solid rgba(251,191,36,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              fontSize: '40px',
            }}
          >
            🖥️
          </div>

          <h1
            style={{
              color: '#f1f5f9',
              fontSize: '22px',
              fontWeight: 800,
              letterSpacing: '-0.01em',
              marginBottom: '14px',
              lineHeight: 1.3,
            }}
          >
            Bu sayfa büyük ekranlar için tasarlandı 🌟
          </h1>

          <p
            style={{
              color: '#94a3b8',
              fontSize: '14px',
              lineHeight: 1.8,
              marginBottom: '28px',
            }}
          >
            TV Panosu, sınıf ekranlarında, akıllı tahtalarda veya masaüstü bilgisayarlarda en iyi deneyimi sunar.
          </p>

          <button
            onClick={() => window.history.back()}
            style={{
              background: 'linear-gradient(135deg, #1e3a5f, #2d4f7c)',
              border: '1px solid rgba(99,179,237,0.3)',
              borderRadius: '14px',
              padding: '13px 28px',
              color: '#bfdbfe',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              letterSpacing: '0.02em',
              transition: 'all 0.2s',
              width: '100%',
            }}
          >
            ← Ana Sayfaya Dön
          </button>
        </div>
      </div>
    );
  }

  const hadith = HADITHS[hadithIdx];
  const motto  = MOTTOS[mottoIdx];

  // Kurum Adı Parçalama
  const fullInstName = institutionName || 'BOLU KILIÇARSLAN';
  const nameParts = fullInstName.split(' ');
  const mainTitle = nameParts[0] || 'BOLU';
  const subTitle  = nameParts.slice(1).join(' ') || 'KILIÇARSLAN';

  return (
    <div
      className="min-h-screen text-white select-none relative overflow-hidden font-sans flex flex-col justify-between p-6 md:p-8 lg:p-10 transition-all duration-1000"
      style={{ background: skyData.skyGradient }}
    >
      <style jsx global>{`
        @keyframes twinkle {
          0% { opacity: 0.1; transform: scale(0.8); }
          100% { opacity: 0.9; transform: scale(1.3); }
        }
        @keyframes shooting-star {
          0% { transform: translateX(0) translateY(0) rotate(-35deg); opacity: 1; width: 0px; }
          70% { opacity: 1; width: 120px; }
          100% { transform: translateX(-600px) translateY(400px) rotate(-35deg); opacity: 0; width: 0px; }
        }
        .shooting-star-1 {
          position: absolute; top: 12%; right: 25%; height: 2px;
          background: linear-gradient(90deg, rgba(255,255,255,1), transparent);
          animation: shooting-star 8s linear 1s infinite; pointer-events: none;
        }
        .shooting-star-2 {
          position: absolute; top: 20%; right: 45%; height: 1.5px;
          background: linear-gradient(90deg, rgba(56,189,248,1), transparent);
          animation: shooting-star 11s linear 5s infinite; pointer-events: none;
        }
        .hadith-transition { transition: opacity 0.5s ease, transform 0.5s ease; }
        .hadith-hidden { opacity: 0; transform: translateY(8px); }
        .hadith-visible { opacity: 1; transform: translateY(0); }

        @keyframes eq-1 { 0%, 100% { height: 4px; } 50% { height: 15px; } }
        @keyframes eq-2 { 0%, 100% { height: 13px; } 50% { height: 5px; } }
        @keyframes eq-3 { 0%, 100% { height: 7px; } 50% { height: 17px; } }
        .eq-bar-1 { animation: eq-1 0.9s ease-in-out infinite; }
        .eq-bar-2 { animation: eq-2 1.1s ease-in-out 0.2s infinite; }
        .eq-bar-3 { animation: eq-3 0.8s ease-in-out 0.4s infinite; }

        @keyframes marquee-scroll {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee-scroll {
          display: flex;
          width: max-content;
          animation: marquee-scroll 48s linear infinite;
        }
        .animate-marquee-scroll:hover {
          animation-play-state: paused;
        }
      `}</style>

      {/* Özel TV Fon Sesi Oynatıcısı (HTML5 Audio Loop) */}
      {customAudio && (
        <audio
          ref={customAudioRef}
          src={customAudio.url}
          loop
          preload="auto"
        />
      )}

      {/* Arka Plan Yıldızları */}
      <Particles isNight={skyData.isNight} />

      {/* İstanbul Şehir Silueti */}
      <IstanbulSilhouetteSVG />

      {/* İlk Giriş Huzur Sesi Başlatma Bildirimi (Kullanıcı etkileşimi için) */}
      {showAudioBanner && !isAudioPlaying && (
        <div 
          onClick={toggleAudio}
          className="fixed top-24 right-8 z-50 bg-gradient-to-r from-emerald-600/95 to-teal-700/95 hover:from-emerald-500 hover:to-teal-600 text-white px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-xl border border-emerald-400/40 cursor-pointer flex items-center gap-3 transition-all animate-bounce"
        >
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <Volume2 size={18} className="text-white" />
          </div>
          <div className="text-left">
            <div className="text-xs font-black uppercase tracking-wider">Huzur Veren Fon Sesi</div>
            <div className="text-[11px] text-emerald-100 font-medium">Ney & Şadırvan sesini başlatmak için dokunun 🌿</div>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); setShowAudioBanner(false); }}
            className="ml-2 text-white/60 hover:text-white text-xs font-bold p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* ─── HEADER (Üst Başlık, Canlı Durum, Huzur Sesi & Canlı Saat) ─── */}
      <div className="relative z-50 flex items-center justify-between gap-4">
        
        {/* Sol: Geri Dön + Logo + Kurum Adı */}
        <div className="flex items-center gap-4 lg:gap-5">
          <button
            onClick={() => router.push('/')}
            title="Geri Dön"
            className="p-3 bg-white/5 hover:bg-white/15 border border-white/10 rounded-2xl text-slate-200 transition-all active:scale-95 shadow-lg backdrop-blur-md shrink-0"
          >
            <ChevronLeft size={22} />
          </button>

          {/* Kurum Logosu */}
          <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-md border border-white/20 flex items-center justify-center p-2 shadow-2xl shrink-0">
            {logoUrl ? (
              <img src={logoUrl} alt={fullInstName} className="w-full h-full object-contain" />
            ) : (
              <div className="w-full h-full rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center">
                <Home size={28} className="text-blue-400" />
              </div>
            )}
          </div>

          <div>
            <h1 className="text-xl md:text-2xl lg:text-3xl font-extrabold tracking-wider text-white uppercase leading-none">
              {mainTitle} <span className="font-semibold text-slate-200">{subTitle}</span>
            </h1>
            <p className="text-sky-300/90 text-xs md:text-sm font-medium mt-1 tracking-wide">
              Geleceği Geçmişe Bağlayan Eğitim
            </p>
          </div>
        </div>

        {/* Sağ: Canlı Rozet + Ses Kontrolü + Saat + Kontroller */}
        <div className="flex items-center gap-3 md:gap-5">
          
          {/* Canlı Bağlantı Göstergesi */}
          <div className="hidden sm:flex items-center gap-2 bg-emerald-500/10 border border-emerald-400/30 px-3 py-1.5 rounded-2xl backdrop-blur-md">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-black text-emerald-300 tracking-wider uppercase">
              CANLI YAYIN
            </span>
          </div>

          {/* Dinlendirici Huzur Sesi Kontrol Hapı */}
          <div className="relative">
            <div className="flex items-center bg-white/5 border border-white/15 rounded-2xl p-1 backdrop-blur-md shadow-lg">
              <button
                onClick={toggleAudio}
                title={isAudioPlaying ? "Huzur Sesini Duraklat" : "Huzur Sesini Başlat"}
                className={`px-3 py-2 rounded-xl transition-all active:scale-95 flex items-center gap-2 text-xs font-bold ${
                  isAudioPlaying
                    ? 'bg-emerald-500/25 border border-emerald-400/50 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.35)]'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                {isAudioPlaying ? (
                  <>
                    <Volume2 size={18} className="text-emerald-400 shrink-0" />
                    <div className="flex items-end gap-0.5 h-3.5 w-3.5">
                      <span className="w-1 bg-emerald-400 rounded-full eq-bar-1" />
                      <span className="w-1 bg-emerald-400 rounded-full eq-bar-2" />
                      <span className="w-1 bg-emerald-400 rounded-full eq-bar-3" />
                    </div>
                    <span className="hidden md:inline">Açık</span>
                  </>
                ) : (
                  <>
                    <VolumeX size={18} className="text-slate-400 shrink-0" />
                    <span className="hidden md:inline">Ses</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setShowVolumePopup(v => !v)}
                title="Ses Seçenekleri ve Seviye Ayarı"
                className={`p-2 rounded-xl transition-all text-xs font-semibold flex items-center gap-1.5 max-w-[170px] ${
                  showVolumePopup 
                    ? 'bg-sky-500/25 text-sky-200 border border-sky-400/40' 
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <Sliders size={16} className="shrink-0" />
                <span className="text-[11px] font-medium hidden md:inline truncate">
                  {soundMode === 'custom' && customAudio
                    ? `🎵 ${customAudio.title}`
                    : soundMode === 'ilahi'
                    ? '🕊️ İlahi'
                    : soundMode === 'ney'
                    ? '🌿 Ney'
                    : '💧 Su'}
                </span>
              </button>
            </div>

            {/* Ses Seviyesi ve Mod Seçici Açılır Kutusu */}
            {showVolumePopup && (
              <>
                <div 
                  className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]" 
                  onClick={() => setShowVolumePopup(false)} 
                />
                <div 
                  className="absolute top-full right-0 mt-2 bg-[#091b3e]/98 backdrop-blur-2xl border border-sky-400/40 rounded-2xl p-4 shadow-[0_20px_60px_rgba(0,0,0,0.8)] z-50 min-w-[280px] space-y-3"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-slate-200 border-b border-sky-500/20 pb-2">
                    <span className="flex items-center gap-1.5 text-emerald-300">
                      <Music size={14} /> TV Fon Müziği
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400 font-mono text-[11px]">%{Math.round(audioVolume * 100)}</span>
                      <button 
                        onClick={() => setShowVolumePopup(false)}
                        className="text-slate-400 hover:text-white text-xs px-1"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* Ses Kaydırıcısı */}
                  <div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={audioVolume}
                      onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                      className="w-full accent-emerald-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Huzur & Özel Ses Modu Seçimi */}
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ses Kaynağı</div>
                    
                    {/* Varsa Yüklenen Özel Ses */}
                    {customAudio && (
                      <button
                        onClick={() => handleSoundModeChange('custom')}
                        className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition-colors ${
                          soundMode === 'custom'
                            ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/50 font-bold shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                            : 'text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex flex-col min-w-0 pr-2">
                          <span className="truncate text-white font-bold flex items-center gap-1">
                            🎵 {customAudio.title}
                          </span>
                          <span className="text-[10px] text-cyan-300/80 font-normal">
                            Ayarlardan Yüklenen Özel Ses
                          </span>
                        </div>
                        {soundMode === 'custom' && <span className="text-cyan-400 text-xs shrink-0">●</span>}
                      </button>
                    )}

                    <button
                      onClick={() => handleSoundModeChange('ilahi')}
                      className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition-colors ${
                        soundMode === 'ilahi'
                          ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/40 font-bold'
                          : 'text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span>🕊️ Tasavvufi İlahi Ezgisi</span>
                        <span className="text-[10px] text-slate-400 font-normal">Tale'al Bedru & Salat-ı Ümmiye</span>
                      </div>
                      {soundMode === 'ilahi' && <span className="text-emerald-400 text-xs">●</span>}
                    </button>

                    <button
                      onClick={() => handleSoundModeChange('ney')}
                      className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition-colors ${
                        soundMode === 'ney'
                          ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/40 font-bold'
                          : 'text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span>🌿 Ney & Şadırvan Suyu</span>
                        <span className="text-[10px] text-slate-400 font-normal">Akustik Ney Taksimi & Su</span>
                      </div>
                      {soundMode === 'ney' && <span className="text-emerald-400 text-xs">●</span>}
                    </button>

                    <button
                      onClick={() => handleSoundModeChange('water')}
                      className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition-colors ${
                        soundMode === 'water'
                          ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/40 font-bold'
                          : 'text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span>💧 Akarsu & Kuş Sesleri</span>
                        <span className="text-[10px] text-slate-400 font-normal">Dingin Doğa Sükûneti</span>
                      </div>
                      {soundMode === 'water' && <span className="text-emerald-400 text-xs">●</span>}
                    </button>
                  </div>

                  <div className="text-[10px] text-slate-400 text-center italic border-t border-sky-500/20 pt-2">
                    {customAudio
                      ? "Özel ses Ayarlar sayfasından yönetilir ⚙️"
                      : "Ayarlar sayfasından istediğiniz özel sesi ekleyebilirsiniz ⚙️"}
                  </div>
                </div>
              </>
            )}
          </div>

          <Clock />

          <div className="flex items-center gap-2">
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? "Tam Ekrandan Çık" : "Tam Ekran Yap"}
              className="p-3 bg-white/5 hover:bg-white/15 border border-white/10 rounded-2xl text-slate-200 transition-all active:scale-95 backdrop-blur-md"
            >
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
            <button
              onClick={fetchData}
              title="Yenile"
              className="p-3 bg-white/5 hover:bg-white/15 border border-white/10 rounded-2xl text-slate-200 transition-all active:scale-95 backdrop-blur-md"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* ─── ORTA ALAN (Hadis-i Şerif & Yemek / Güncel Rapor / Motto Kartları) ─── */}
      <div className="relative z-10 grid grid-cols-12 gap-6 my-4 md:my-6 flex-1 items-stretch">
        
        {/* SOL KUTU: Günün Hadis-i Şerifi */}
        <div className="col-span-12 lg:col-span-8 bg-gradient-to-b from-[#081b3b]/85 via-[#0a234e]/75 to-[#071735]/85 backdrop-blur-xl border border-sky-500/20 rounded-3xl p-8 flex flex-col justify-between relative overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          
          {/* Başlık Vurgusu */}
          <div className="flex items-center justify-center gap-3 text-amber-400 font-extrabold text-xs md:text-sm tracking-[0.2em] uppercase">
            <span className="text-amber-400/60">═══➔</span>
            <BookOpen size={20} className="text-amber-400" />
            <span>GÜNÜN HADİS-İ ŞERİFİ</span>
            <span className="text-amber-400/60">⇚═══</span>
          </div>

          {/* Hadis Metni & Tırnaklar */}
          <div className={`my-auto py-6 text-center relative px-6 md:px-12 hadith-transition ${hadithVisible ? 'hadith-visible' : 'hadith-hidden'}`}>
            <span className="absolute top-0 left-0 text-sky-400/30 text-7xl font-serif leading-none select-none">“</span>
            <p className="text-xl md:text-2xl lg:text-3xl font-medium leading-relaxed text-slate-100 italic tracking-wide font-serif">
              {hadith.text}
            </p>
            <span className="absolute bottom-0 right-0 text-sky-400/30 text-7xl font-serif leading-none select-none">”</span>
          </div>

          {/* Kaynak */}
          <div className={`text-center pt-2 hadith-transition ${hadithVisible ? 'hadith-visible' : 'hadith-hidden'}`}>
            <span className="text-amber-400/90 text-sm font-bold tracking-wider">
              {hadith.source}
            </span>
          </div>

          {/* Geometrik Arka Plan Desenleri */}
          <div className="absolute inset-0 pointer-events-none opacity-10 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />
        </div>

        {/* SAĞ KUTU: 3'lü Otomatik Rotasyon (1. Yemek Menüsü, 2. Canlı Başarı/Gayret Raporu, 3. Motto) */}
        {activeRightTab === 'menu' && foodMenu && (foodMenu.breakfast || foodMenu.lunch || foodMenu.dinner) ? (
          /* 1. SEÇENEK: YEMEK MENÜSÜ */
          <div className="col-span-12 lg:col-span-4 bg-gradient-to-b from-[#1a1442]/95 via-[#231554]/90 to-[#120d33]/95 backdrop-blur-xl border border-amber-500/30 rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
              <div className="flex items-center gap-2 text-amber-400 font-black text-xs md:text-sm tracking-wider uppercase">
                <Utensils size={18} />
                <span>GÜNÜN YEMEK MENÜSÜ</span>
              </div>
              <span className="text-[10px] font-bold text-amber-200 bg-amber-500/20 border border-amber-400/30 px-2 py-0.5 rounded-md">
                {foodMenu.dayName || 'Bugün'}
              </span>
            </div>

            <div className={`space-y-3 my-auto py-2 hadith-transition ${hadithVisible ? 'hadith-visible' : 'hadith-hidden'}`}>
              {foodMenu.breakfast && (
                <div className="bg-white/5 border border-amber-500/15 rounded-2xl p-3 text-left">
                  <div className="text-amber-300 font-extrabold text-[11px] uppercase tracking-wide flex items-center gap-1.5 mb-0.5">
                    <Coffee size={12} className="text-amber-400" />
                    Sabah Kahvaltısı
                  </div>
                  <div className="text-slate-100 text-xs font-medium leading-relaxed">
                    {foodMenu.breakfast}
                  </div>
                </div>
              )}

              {foodMenu.lunch && (
                <div className="bg-white/5 border border-orange-500/15 rounded-2xl p-3 text-left">
                  <div className="text-orange-300 font-extrabold text-[11px] uppercase tracking-wide flex items-center gap-1.5 mb-0.5">
                    <Sun size={12} className="text-orange-400" />
                    Öğle Yemeği
                  </div>
                  <div className="text-slate-100 text-xs font-medium leading-relaxed">
                    {foodMenu.lunch}
                  </div>
                </div>
              )}

              {foodMenu.dinner && (
                <div className="bg-white/5 border border-indigo-500/15 rounded-2xl p-3 text-left">
                  <div className="text-sky-300 font-extrabold text-[11px] uppercase tracking-wide flex items-center gap-1.5 mb-0.5">
                    <Moon size={12} className="text-sky-400" />
                    Akşam Yemeği
                  </div>
                  <div className="text-slate-100 text-xs font-medium leading-relaxed">
                    {foodMenu.dinner}
                  </div>
                </div>
              )}
            </div>

            <div className="text-center pt-2 border-t border-white/5">
              <span className="text-amber-300/80 text-[11px] font-semibold italic">
                {foodMenu.note || 'Afiyet ve şifa olsun 🤍'}
              </span>
            </div>
            <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          </div>

        ) : activeRightTab === 'reports' && recentReports.length > 0 ? (
          /* 2. SEÇENEK: CANLI BAŞARI & GAYRET RAPORU */
          <div className="col-span-12 lg:col-span-4 bg-gradient-to-b from-[#0c244c]/95 via-[#113166]/90 to-[#091b38]/95 backdrop-blur-xl border border-sky-400/30 rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            <div className="flex items-center justify-between border-b border-sky-500/20 pb-3">
              <div className="flex items-center gap-2 text-sky-400 font-black text-xs md:text-sm tracking-wider uppercase">
                <Sparkles size={18} className="text-amber-400" />
                <span>GÜNCEL GELİŞİM & GAYRET</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-400/30 px-2 py-0.5 rounded-md flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Canlı Not
              </span>
            </div>

            {(() => {
              const currRep = recentReports[reportIdx % recentReports.length];
              const categoryIcons = {
                'namaz': '🤲',
                'akademik': '📚',
                'program': '📋',
                'sağlık': '🩺',
                'yemek': '🍽️',
                'dahili': '✨'
              };
              const icon = categoryIcons[(currRep.category || '').toLowerCase()] || '📌';

              return (
                <div className={`my-auto py-3 space-y-3 hadith-transition ${hadithVisible ? 'hadith-visible' : 'hadith-hidden'}`}>
                  <div className="bg-white/5 border border-sky-400/20 rounded-2xl p-4 text-left">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-amber-300 font-extrabold text-sm flex items-center gap-1.5">
                        <span>{icon}</span> {currRep.student_name || 'Öğrencimiz'}
                      </span>
                      <span className="text-[10px] font-bold text-sky-300 bg-sky-500/20 border border-sky-400/30 px-2 py-0.5 rounded-full">
                        {currRep.category || 'Gözlem'}
                      </span>
                    </div>
                    <p className="text-slate-100 text-xs md:text-sm font-medium leading-relaxed italic">
                      &ldquo;{currRep.content}&rdquo;
                    </p>
                    {currRep.created_at && (
                      <div className="text-[10px] text-slate-400 mt-3 font-mono">
                        {new Date(currRep.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            <div className="text-center pt-2 border-t border-white/5">
              <span className="text-sky-300/80 text-[11px] font-semibold italic">
                Tüm öğrencilerimize muvaffakiyetler dileriz 🌟
              </span>
            </div>
            <div className="absolute top-0 right-0 w-36 h-36 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
          </div>

        ) : (
          /* 3. SEÇENEK: GÜNÜN MOTİVASYON VE AHLAK SÖZÜ */
          <div className="col-span-12 lg:col-span-4 bg-gradient-to-b from-[#131c54]/90 via-[#1b1968]/85 to-[#24135e]/90 backdrop-blur-xl border border-purple-500/25 rounded-3xl p-8 flex flex-col justify-between items-center text-center relative overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            <div className="w-16 h-16 rounded-full bg-indigo-500/15 border border-purple-400/30 flex items-center justify-center text-sky-300 mt-4 shadow-inner">
              <Sun size={32} className="text-amber-300" />
            </div>

            <div className={`my-auto hadith-transition ${hadithVisible ? 'hadith-visible' : 'hadith-hidden'}`}>
              <h2 className="text-xl md:text-2xl font-extrabold text-white leading-tight mb-4 tracking-wide">
                {motto.title}
              </h2>
              <div className="w-12 h-0.5 bg-purple-400/40 mx-auto mb-4" />
              <p className="text-slate-300 text-sm font-medium">
                {motto.sub}
              </p>
            </div>

            <div className="mb-2 text-purple-300/60">
              <Heart size={20} className="mx-auto text-purple-400/60" />
            </div>
            <div className="absolute bottom-0 inset-x-0 h-32 pointer-events-none opacity-20 bg-gradient-to-t from-purple-900 via-purple-800 to-transparent" />
          </div>
        )}
      </div>

      {/* ─── CANLI GELİŞMELER & TEBRİKLER AKIŞI (Canlı Kayan Yazı Bandı) ─── */}
      <div className="relative z-10 my-2 md:my-3 bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-2.5 flex items-center gap-4 overflow-hidden shadow-lg">
        <div className="flex items-center gap-2 shrink-0 bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-black tracking-wider uppercase px-3 py-1 rounded-xl">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>CANLI AKIŞ</span>
        </div>
        
        <div className="flex-1 overflow-hidden relative">
          <div className="animate-marquee-scroll flex items-center gap-8 whitespace-nowrap text-xs md:text-sm font-medium text-slate-200">
            {tickerItems.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-amber-400 font-bold">{item.title}</span>
                <span className="text-slate-300">{item.text}</span>
                <span className="text-sky-400/40 ml-4">•</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── İSTATİSTİK KARTLARI (Canlı Veriler) ─── */}
      <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
        
        {/* 1. ÖĞRENCİ */}
        <div className="bg-[#091b3e]/75 backdrop-blur-md border border-sky-500/20 rounded-2xl p-4 flex items-center gap-4 shadow-lg">
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-blue-600/30 border border-blue-400/40 flex items-center justify-center shrink-0">
            <Users size={24} className="text-blue-400" />
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              <AnimatedCounter value={students.length} />
            </div>
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">AKTİF ÖĞRENCİ</div>
            <div className="text-[11px] text-slate-400 font-medium">Kayıtlı talebe</div>
          </div>
        </div>

        {/* 2. CANLI RAPOR TAKİBİ */}
        <div className="bg-[#091b3e]/75 backdrop-blur-md border border-sky-500/20 rounded-2xl p-4 flex items-center gap-4 shadow-lg">
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-emerald-600/30 border border-emerald-400/40 flex items-center justify-center shrink-0">
            <Award size={24} className="text-emerald-400" />
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              <AnimatedCounter value={reports.length} />
            </div>
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">CANLI TAKİP</div>
            <div className="text-[11px] text-slate-400 font-medium">Bu haftaki değerlendirme</div>
          </div>
        </div>

        {/* 3. SINIF & EĞİTİM KADROSU */}
        <div className="bg-[#091b3e]/75 backdrop-blur-md border border-sky-500/20 rounded-2xl p-4 flex items-center gap-4 shadow-lg">
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-purple-600/30 border border-purple-400/40 flex items-center justify-center shrink-0">
            <Home size={24} className="text-purple-400" />
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              <AnimatedCounter value={classesCount} />
            </div>
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">AKTİF SINIF</div>
            <div className="text-[11px] text-slate-400 font-medium">{teachersCount} öğretmen ile</div>
          </div>
        </div>

        {/* 4. DEVAM ORANI */}
        <div className="bg-[#091b3e]/75 backdrop-blur-md border border-sky-500/20 rounded-2xl p-4 flex items-center gap-4 shadow-lg">
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-amber-600/30 border border-amber-400/40 flex items-center justify-center shrink-0">
            <CheckCircle2 size={24} className="text-amber-400" />
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              %{attendanceRate}
            </div>
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">DEVAM ORANI</div>
            <div className="text-[11px] text-slate-400 font-medium">Program intizamı</div>
          </div>
        </div>
      </div>

      {/* ─── FOOTER (Temiz ve Kurumsal: İlim · İyilik · İstikrar) ─── */}
      <div className="relative z-10 pt-3 text-center border-t border-sky-500/10 mt-3 flex items-center justify-between text-slate-400 text-xs">
        <div className="text-xs font-semibold text-slate-400/80 hidden sm:block">
          Bolu Kılıçarslan Eğitim Panosu
        </div>

        <div className="flex items-center justify-center gap-4 text-sky-200/80 font-bold tracking-[0.3em] uppercase mx-auto">
          <span>İLİM</span>
          <span className="text-sky-400/40">•</span>
          <span>İYİLİK</span>
          <span className="text-sky-400/40">•</span>
          <span>İSTİKRAR</span>
        </div>

        <div className="text-xs text-emerald-400/90 font-medium flex items-center gap-1.5 hidden sm:flex">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          Canlı Sistem
        </div>
      </div>
    </div>
  );
}

export default dynamic(() => Promise.resolve(TVContent), {
  ssr: false,
  loading: () => (
    <div style={{ minHeight: '100vh', background: '#010818', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '36px', height: '36px', border: '3px solid rgba(251,191,36,0.3)', borderTopColor: '#fbbf24', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  ),
});