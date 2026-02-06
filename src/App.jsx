import React, { useState, useEffect, useRef } from 'react';
import Confetti from 'react-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import './App.css';

const TARGET_DATE = "2026-02-05T15:57:00"; 

const GALLERY_DATA = [
  { img: "couple.png", msg: "I remember this day like it was yesterday." },
  { img: "couple.png", msg: "You always know how to make me laugh." },
  { img: "couple.png", msg: "Simply the most beautiful person I know." },
  { img: "couple.png", msg: "I love you more than words can say. Happy Birthday! ❤️" },
  { img: "couple.png", msg: "I remember this day like it was yesterday." },
  { img: "couple.png", msg: "You always know how to make me laugh." },
  { img: "couple.png", msg: "Simply the most beautiful person I know." },
  { img: "couple.png", msg: "I love you more than words can say. Happy Birthday! ❤️" },
];

const LETTER_CONTENT = {
  title: "A Letter To You",
  body: "My Dearest, seeing you grow another year older is a blessing. You bring so much light into my world. I hope this little digital surprise made you smile. I promise to be there for every candle you blow out in the future. I love you endlessly.",
  sender: "Yours, [Your Name]"
};

function App() {
  const [stage, setStage] = useState('countdown'); 
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());
  const [candlesBlown, setCandlesBlown] = useState(false);
  const [micError, setMicError] = useState(false);

  // Refs for audio and microphone
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const microphoneRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);
  
  // VITE CHANGE: Direct paths allow access to public folder assets
  const songRef = useRef(new Audio('/song.mp3'));
  const popRef = useRef(new Audio('/pop.mp3'));

  function calculateTimeLeft() {
    const difference = +new Date(TARGET_DATE) - +new Date();
    return difference > 0 ? difference : 0;
  }

  // --- TIMER LOOP ---
  useEffect(() => {
    if (stage !== 'countdown') return;

    const timer = setInterval(() => {
      const t = calculateTimeLeft();
      setTimeLeft(t);
    }, 1000);

    return () => clearInterval(timer);
  }, [stage]);

  // --- AUDIO & MIC LOGIC ---
  useEffect(() => {
    if (stage === 'cake') {
      songRef.current.loop = true;
      songRef.current.volume = 0.5;
      
      songRef.current.play().catch(e => console.log("Audio play failed:", e));
      setTimeout(() => startListening(), 1000);
    } else {
      stopListening();
      songRef.current.pause();
    }
    
    return () => {
      songRef.current.pause();
      stopListening();
    };
  }, [stage]);

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream; 
      
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);
      microphoneRef.current.connect(analyserRef.current);

      analyserRef.current.fftSize = 2048; 
      analyserRef.current.smoothingTimeConstant = 0.3; 

      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      let blowTriggerCount = 0;
      const BLOW_THRESHOLD = 50; 
      const REQUIRED_FRAMES = 3; 
      const LOW_FREQ_RANGE = 10; 

      const checkVolume = () => {
        if (candlesBlown) {
          stopListening();
          return;
        }

        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);

          let lowFreqSum = 0;
          for (let i = 0; i < LOW_FREQ_RANGE; i++) {
            lowFreqSum += dataArray[i];
          }
          const lowFreqAverage = lowFreqSum / LOW_FREQ_RANGE;

          let totalSum = 0;
          for (let i = 0; i < bufferLength; i++) {
            totalSum += dataArray[i];
          }
          const totalAverage = totalSum / bufferLength;

          // console.log("Low freq:", lowFreqAverage.toFixed(2), "Total:", totalAverage.toFixed(2));

          if (lowFreqAverage > BLOW_THRESHOLD || totalAverage > 35) {
            blowTriggerCount++;
          } else {
            blowTriggerCount = 0;
          }

          if (blowTriggerCount >= REQUIRED_FRAMES) {
            blowOutCandles();
            return; 
          }
        }

        animationFrameRef.current = requestAnimationFrame(checkVolume);
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
    stopListening();
    popRef.current.play().catch(() => { });
    setTimeout(() => setStage('gift'), 3000);
  };

  const stopListening = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (microphoneRef.current) {
      microphoneRef.current.disconnect();
      microphoneRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log("Microphone stopped");
      });
      streamRef.current = null;
    }

    analyserRef.current = null;
  };

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, []);

  const formatTime = (ms) => {
    const s = Math.floor((ms / 1000) % 60);
    const m = Math.floor((ms / 1000 / 60) % 60);
    const h = Math.floor((ms / (1000 * 60 * 60)) % 24);
    const d = Math.floor(ms / (1000 * 60 * 60 * 24));
    return `${d}d ${h}h ${m}m ${s}s`;
  };

  const handleOpenClick = () => {
    setStage('cake');
  };

  const generateThreadPath = (count) => {
    const stepY = 450;
    let path = `M 50 0 `; 
    for (let i = 0; i <= count; i++) {
      const yStart = i * stepY;
      const yEnd = (i + 1) * stepY;
      const controlX = i % 2 === 0 ? 10 : 90;
      path += `Q ${controlX} ${yStart + stepY / 2}, 50 ${yEnd} `;
    }
    return path;
  };

  const getBackgroundImage = () => {
    // VITE CHANGE: Removed process.env.PUBLIC_URL
    if (stage === 'gallery') return `url('/gallerybackground.png')`;
    return 'none'; 
  };

  return (
    <div className="App">
      <div 
        className="global-background" 
        style={{ backgroundImage: getBackgroundImage() }}
      />

      {candlesBlown && <Confetti numberOfPieces={300} recycle={stage !== 'gallery'} />}

      <AnimatePresence >
        {/* STAGE 1: COUNTDOWN */}
        {stage === 'countdown' && (
          <motion.div 
            key="count" 
            className="screen countdown-screen" 
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.5 } }}
          >
            <div className="countdown-container">
              <div className="text-center">
                <Sparkles className="sparkle-icon" />
                <h1 className="countdown-title">Something Special is Coming...</h1>
                <p className="countdown-subtitle">Get Ready! 🎉</p>
              </div>

              <div className="timer-wrapper">
                {timeLeft > 0 ? (
                  <>
                    <div className="timer-text main-text">
                      {formatTime(timeLeft)}
                    </div>
                  </>
                ) : (
                  <motion.button 
                    initial={{ scale: 0 }} 
                    animate={{ scale: 1 }}
                    whileHover={{ scale: 1.1 }}
                    onClick={handleOpenClick}
                    className="enter-btn"
                  >
                    It's Time! Open Surprise 🎁
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* STAGE 2: THE CAKE PARTY */}
        {stage === 'cake' && (
          <motion.div key="cake" className="screen cake-screen"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <div
              className="ribbon-banner"
              style={{ backgroundImage: `url('/ribbons.png')` }}
            ></div>

            <div className="decorations">
              <img src={'/balloons.png'} alt="Balloon" className="fixed-balloon" style={{ top: '20%', left: '5%' }} />
              <img src={'/balloons.png'} alt="Balloon" className="fixed-balloon" style={{ top: '15%', right: '10%' }} />
              <img src={'/balloons.png'} alt="Balloon" className="fixed-balloon" style={{ top: '50%', left: '10%' }} />
              <img src={'/balloons.png'} alt="Balloon" className="fixed-balloon" style={{ bottom: '30%', right: '15%' }} />
              <img src={'/balloons.png'} alt="Balloon" className="fixed-balloon" style={{ bottom: '20%', left: '0' }} />
              <img src={'/balloons.png'} alt="Balloon" className="fixed-balloon" style={{ bottom: '50%', right: '25%' }} />
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
              <img src={'/cakeimg.png'} alt="Cake" className="cake-image" />
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

        {/* STAGE 4: NEW VERTICAL GALLERY */}
        {stage === 'gallery' && (
          <motion.div key="gallery" className="screen gallery-screen" 
            style={{backgroundImage : `url('/gallerybackground.png')`}}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          >
            <div className="gallery-container">
               <svg className="thread-svg" viewBox={`0 0 100 ${GALLERY_DATA.length * 400 + 400}`} preserveAspectRatio="none">
                 <path d={generateThreadPath(GALLERY_DATA.length)} stroke="#8d6e63" strokeWidth="0.5" fill="none" />
              </svg>

              {GALLERY_DATA.map((card, index) => (
                <motion.div
                  key={index}
                  className="polaroid-card"
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{
                    opacity: 1,
                    y: 0,
                    rotate: index % 2 === 0 ? [2, -2] : [-2, 2]
                  }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{
                    opacity: { duration: 0.8, delay: index * 0.2 },
                    y: { duration: 0.8, delay: index * 0.2 },
                    rotate: {
                      duration: 3, 
                      repeat: Infinity, 
                      repeatType: "mirror", 
                      ease: "easeInOut", 
                      delay: index * 0.2 
                    }
                  }}
                  style={{
                    transformOrigin: 'top center',
                    zIndex: 5
                  }}
                >
                  <div className="pin" style={{ backgroundImage: `url('/pinimg.png')` }}></div>

                  <img src={`/${card.img}`} alt="memory" className="polaroid-img" />
                  <div className="polaroid-caption">{card.msg}</div>
                </motion.div>
              ))}

              <motion.div 
                className="letter-container"
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1 }}
              >
                <div className="pin" style={{ backgroundImage: `url('/pinimg.png')` }}></div>
                <div className="letter-title">{LETTER_CONTENT.title}</div>
                <div className="letter-body">
                  {LETTER_CONTENT.body}
                </div>
                <div className="signature">{LETTER_CONTENT.sender}</div>
              </motion.div>

              <div style={{ height: '100px' }}></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;