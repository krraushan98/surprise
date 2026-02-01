import React, { useState, useEffect, useRef } from 'react';
import Confetti from 'react-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';

// --- CONFIGURATION ---
// ⚠️ IMPORTANT: Set this to a specific time for testing! 
// If this date is in the past, the button will show immediately.
const TARGET_DATE = "2026-02-01T15:57:00"; 

const GALLERY_DATA = [
  { img: "https://via.placeholder.com/400x500/ff7eb3/fff?text=Our+First+Date", msg: "I remember this day like it was yesterday." },
  { img: "https://via.placeholder.com/400x500/81ecec/fff?text=Crazy+Times", msg: "You always know how to make me laugh." },
  { img: "https://via.placeholder.com/400x500/fab1a0/fff?text=Beautiful+You", msg: "Simply the most beautiful person I know." },
  { img: "https://via.placeholder.com/400x500/a29bfe/fff?text=Happy+Birthday", msg: "I love you more than words can say. Happy Birthday! ❤️" },
];

function App() {
  const [stage, setStage] = useState('countdown'); 
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());
  const [candlesBlown, setCandlesBlown] = useState(false);
  const [micError, setMicError] = useState(false);

  // Audio Refs
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const microphoneRef = useRef(null);
  const songRef = useRef(new Audio(process.env.PUBLIC_URL + '/song.mp3'));
  const popRef = useRef(new Audio(process.env.PUBLIC_URL + '/pop.mp3'));

  function calculateTimeLeft() {
    const difference = +new Date(TARGET_DATE) - +new Date();
    return difference > 0 ? difference : 0;
  }

  // --- TIMER LOOP ---
  useEffect(() => {
    // Only run the timer if we are in the countdown stage
    if (stage !== 'countdown') return;

    const timer = setInterval(() => {
      const t = calculateTimeLeft();
      setTimeLeft(t);
      
      // Note: We do NOT auto-switch to 'cake' here anymore.
      // We just let timeLeft hit 0, which triggers the button to appear in the JSX below.
    }, 1000);

    return () => clearInterval(timer);
  }, [stage]);

  // --- AUDIO & MIC LOGIC ---
  useEffect(() => {
    if (stage === 'cake') {
      songRef.current.loop = true;
      songRef.current.volume = 0.5;
      
      // This play() is now safe because it happens after the user clicks the "Open" button
      songRef.current.play().catch(e => console.log("Audio play failed:", e));

      startListening();
    }
    
    return () => {
      songRef.current.pause();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, [stage]);

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);
      microphoneRef.current.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;

      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      // Variable to track how long the sound has been loud
      let blowTriggerCount = 0; 

      const checkVolume = () => {
        if (candlesBlown) return;
        
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
          const average = sum / bufferLength;
          console.log("Average volume:", average);
          
          if (average > 30) {
            blowOutCandles();
            //blowTriggerCount++;
          } else {
            blowTriggerCount = 0; // Reset if sound stops
          }

          // 2. SUSTAIN CHECK: Require sound to be loud for 5 consecutive frames
          // This prevents a single "click" or noise spike from blowing it out
          if (blowTriggerCount > 1) {
            blowOutCandles();
          }
        }
        
        requestAnimationFrame(checkVolume);
      };
      
      checkVolume();
    } catch (err) { 
      console.error("Mic error:", err); 
      setMicError(true); 
    }
  };

  const blowOutCandles = () => {
    if (candlesBlown) return;
    setCandlesBlown(true);
    popRef.current.play().catch(() => {});
    setTimeout(() => setStage('gift'), 3000);
  };

  const formatTime = (ms) => {
    const s = Math.floor((ms / 1000) % 60);
    const m = Math.floor((ms / 1000 / 60) % 60);
    const h = Math.floor((ms / (1000 * 60 * 60)) % 24);
    const d = Math.floor(ms / (1000 * 60 * 60 * 24));
    return `${d}d ${h}h ${m}m ${s}s`;
  };

  const handleOpenClick = () => {
    setStage('cake');
    songRef.current.play().catch(e => console.log(e)); 
  };

  return (
    <div className="App">
      {candlesBlown && <Confetti numberOfPieces={300} recycle={stage !== 'gallery'} />}

      <AnimatePresence mode="wait">

        {/* STAGE 1: COUNTDOWN */}
        {stage === 'countdown' && (
          <motion.div key="count" className="screen countdown-screen" exit={{ opacity: 0 }}>
            
            {/* LOGIC: If Time > 0, Show Timer. Else, Show Button */}
            {timeLeft > 0 ? (
              <>
                <h1 style={{ marginBottom: 0 }}>Waiting for the moment...</h1>
                <div className="timer">{formatTime(timeLeft)}</div>
              </>
            ) : (
              /* THIS BUTTON ONLY APPEARS WHEN timeLeft IS 0 */
              <motion.button 
                initial={{ scale: 0 }} 
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.1 }}
                onClick={handleOpenClick}
                className="enter-btn"
                style={{
                  padding: '15px 40px', fontSize: '24px', 
                  background: '#ff4081', color: 'white', border: 'none', 
                  borderRadius: '50px', cursor: 'pointer', boxShadow: '0 5px 15px rgba(255,64,129,0.4)'
                }}
              >
                It's Time! Open Surprise 🎁
              </motion.button>
            )}

          </motion.div>
        )}

        {/* STAGE 2: THE CAKE PARTY */}
        {stage === 'cake' && (
          <motion.div key="cake" className="screen cake-screen"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <div
              className="ribbon-banner"
              style={{ backgroundImage: `url('${process.env.PUBLIC_URL}/ribbons.png')` }}
            ></div>

            <div className="decorations">
              <img src={process.env.PUBLIC_URL + '/balloons.png'} alt="Balloon" className="fixed-balloon" style={{ top: '20%', left: '5%' }} />
              <img src={process.env.PUBLIC_URL + '/balloons.png'} alt="Balloon" className="fixed-balloon" style={{ top: '15%', right: '10%' }} />
              <img src={process.env.PUBLIC_URL + '/balloons.png'} alt="Balloon" className="fixed-balloon" style={{ top: '50%', left: '10%' }} />
              <img src={process.env.PUBLIC_URL + '/balloons.png'} alt="Balloon" className="fixed-balloon" style={{ bottom: '30%', right: '15%' }} />
              <img src={process.env.PUBLIC_URL + '/balloons.png'} alt="Balloon" className="fixed-balloon" style={{ bottom: '20%', left: '0' }} />
              <img src={process.env.PUBLIC_URL + '/balloons.png'} alt="Balloon" className="fixed-balloon" style={{ bottom: '50%', right: '25%' }} />
            </div>

            <div className="banner-text">Happy Birthday My Love!</div>

            <div className="cake-container" onClick={blowOutCandles} style={{ cursor: 'pointer' }}>
              <div className="candles-container-on-cake">
                {[1, 2, 3].map(i => (
                  <div className="candle" key={i}>
                    <div className={`flame ${candlesBlown ? 'out' : ''}`}></div>
                  </div>
                ))}
              </div>
              <img src={process.env.PUBLIC_URL + '/cakeimg.png'} alt="Cake" className="cake-image" />
            </div>

            <p style={{ marginTop: 20, zIndex: 10, color: '#555', fontWeight: 'bold' }}>
              {candlesBlown 
                ? "Yay! Make a wish!" 
                : micError 
                  ? "Tap the cake to make a wish! (Mic not detected)" 
                  : "Blow into the mic to make a wish!"
              }
            </p>
          </motion.div>
        )}

        {/* STAGE 3: THE GIFT BOX */}
        {stage === 'gift' && (
          <motion.div key="gift" className="screen gift-screen"
            initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ opacity: 0, scale: 2 }}
          >
            <motion.div className="gift-box"
              animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              onClick={() => setStage('gallery')}
            >
              🎁
            </motion.div>
            <h2 style={{ color: '#fff' }}>Tap to open your present</h2>
          </motion.div>
        )}

        {/* STAGE 4: THE GALLERY */}
        {stage === 'gallery' && (
          <motion.div key="gallery" className="screen gallery-screen"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          >
            <div className="scroll-container">
              {GALLERY_DATA.map((card, index) => (
                <div className="card" key={index}>
                  <img src={card.img} alt="memory" className="card-img" />
                  <div className="card-msg">{card.msg}</div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}

export default App;