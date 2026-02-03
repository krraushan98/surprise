import React, { useState, useEffect, useRef } from 'react';
import Confetti from 'react-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';


const TARGET_DATE = "2026-02-01T15:57:00"; 

const GALLERY_DATA = [
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

      setTimeout(() =>startListening(), 1000);
    }
    
    return () => {
      songRef.current.pause();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, [stage]);

  // const startListening = async () => {
  //   try {
  //     const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  //     audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
  //     analyserRef.current = audioContextRef.current.createAnalyser();
  //     microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);
  //     microphoneRef.current.connect(analyserRef.current);
  //     analyserRef.current.fftSize = 256;

  //     const bufferLength = analyserRef.current.frequencyBinCount;
  //     const dataArray = new Uint8Array(bufferLength);
      
  //     // Variable to track how long the sound has been loud
  //     let blowTriggerCount = 0; 

  //     const checkVolume = () => {
  //       if (candlesBlown) return;
        
  //       if (analyserRef.current) {
  //         analyserRef.current.getByteFrequencyData(dataArray);
  //         let sum = 0;
  //         for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
  //         const average = sum / bufferLength;
  //         console.log("Average volume:", average);
          
  //         if (average > 30) {
  //           blowOutCandles();
  //           //blowTriggerCount++;
  //         } else {
  //           blowTriggerCount = 0; // Reset if sound stops
  //         }

  //         // 2. SUSTAIN CHECK: Require sound to be loud for 5 consecutive frames
  //         // This prevents a single "click" or noise spike from blowing it out
  //         if (blowTriggerCount > 1) {
  //           blowOutCandles();
  //         }
  //       }
        
  //       requestAnimationFrame(checkVolume);
  //     };
      
  //     checkVolume();
  //   } catch (err) { 
  //     console.error("Mic error:", err); 
  //     setMicError(true); 
  //   }
  // };

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);
      microphoneRef.current.connect(analyserRef.current);

      // Better settings for detecting blowing
      analyserRef.current.fftSize = 2048; // Higher resolution
      analyserRef.current.smoothingTimeConstant = 0.3; // Less smoothing for quick response

      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      let blowTriggerCount = 0;
      const BLOW_THRESHOLD = 50; // Adjust based on testing
      const REQUIRED_FRAMES = 3; // Must sustain for 3 frames (~50ms)
      const LOW_FREQ_RANGE = 10; // Check first 10 frequency bins (low frequencies)

      const checkVolume = () => {
        if (candlesBlown) return;

        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);

          // Focus on LOW frequencies - blowing creates low-frequency noise
          let lowFreqSum = 0;
          for (let i = 0; i < LOW_FREQ_RANGE; i++) {
            lowFreqSum += dataArray[i];
          }
          const lowFreqAverage = lowFreqSum / LOW_FREQ_RANGE;

          // Also check overall energy for sudden spikes
          let totalSum = 0;
          for (let i = 0; i < bufferLength; i++) {
            totalSum += dataArray[i];
          }
          const totalAverage = totalSum / bufferLength;

          console.log("Low freq:", lowFreqAverage.toFixed(2), "Total:", totalAverage.toFixed(2));

          // Detect blow: strong low frequencies OR sudden spike in total energy
          if (lowFreqAverage > BLOW_THRESHOLD || totalAverage > 35) {
            blowTriggerCount++;
            console.log("Blow detected! Count:", blowTriggerCount);
          } else {
            blowTriggerCount = 0;
          }

          // Trigger candle blow out after sustained detection
          if (blowTriggerCount >= REQUIRED_FRAMES) {
            console.log("🎂 Candles blown out!");
            blowOutCandles();
            stopListening();
            blowTriggerCount = 0; // Reset after triggering
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
    popRef.current.play().catch(() => { });
    setTimeout(() => setStage('gift'), 3000);
  };

  const stopListening = () => {
    // Cancel animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Disconnect audio nodes
    if (microphoneRef.current) {
      microphoneRef.current.disconnect();
      microphoneRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Stop all tracks in the media stream (turns off mic)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log("Microphone stopped");
      });
      streamRef.current = null;
    }

    analyserRef.current = null;
  };

// Make sure to add streamRef at the top with other refs
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Cleanup on unmount
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
    songRef.current.play().catch(e => console.log(e)); 
  };


  const generateThreadPath = (count) => {
    // Each card is roughly 400px apart vertically
    const stepY = 400; 
    let path = `M 50 0 `; // Start top center (assuming viewbox 0-100 width)
    
    // Create a curve for each card + 1 for the letter
    for (let i = 0; i <= count; i++) {
      const yStart = i * stepY;
      const yEnd = (i + 1) * stepY;
      
      // Control points for Bezier Curve (creates the S shape)
      // Alternates left and right
      const controlX = i % 2 === 0 ? 10 : 90; 
      
      // Smooth S-Curve
      path += `Q ${controlX} ${yStart + stepY / 2}, 50 ${yEnd} `;
    }
    return path;
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
        {/* {stage === 'gallery' && (
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
        )} */}

        {/* STAGE 4: NEW VERTICAL GALLERY */}
        {stage === 'gallery' && (
          <motion.div key="gallery" className="screen gallery-screen" 
          style={{backgroundImage : `url('${process.env.PUBLIC_URL}/gallerybackground.png')`}}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          >
            <div className="gallery-container">
              
              {/* THE THREAD (SVG) */}
              <svg className="thread-svg" viewBox={`0 0 100 ${GALLERY_DATA.length * 400 + 400}`} preserveAspectRatio="none">
                 <path d={generateThreadPath(GALLERY_DATA.length)} stroke="#8d6e63" strokeWidth="0.5" fill="none" />
              </svg>

              {GALLERY_DATA.map((card, index) => (
                <motion.div
                  key={index}
                  className="polaroid-card"
                  // Initial state: invisible and slightly down
                  initial={{ opacity: 0, y: 50 }}
                  // Animate when in view: fade in, move up, AND start swinging continuously
                  whileInView={{
                    opacity: 1,
                    y: 0,
                    // Keyframes for swinging: rotate back and forth slightly
                    rotate: index % 2 === 0 ? [2, -2] : [-2, 2]
                  }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{
                    opacity: { duration: 0.8, delay: index * 0.2 },
                    y: { duration: 0.8, delay: index * 0.2 },
                    // Swing transition specifics
                    rotate: {
                      duration: 3, // Time for one full swing cycle (slower is more peaceful)
                      repeat: Infinity, // Loop forever
                      repeatType: "mirror", // Swing back and forth seamlessly
                      ease: "easeInOut", // Smooth turning points
                      delay: index * 0.2 // Start swinging as it appears
                    }
                  }}
                  style={{
                    // CRITICAL: Set pivot point to top center for hanging effect
                    transformOrigin: 'top center',
                    // Stagger items Left and Right roughly
                    // marginLeft: index % 2 === 0 ? '-130px' : '130px',
                    // marginBottom: '100px',
                    zIndex: 5
                  }}
                >
                  {/* The Image Pin at top */}
                  <div className="pin" style={{ backgroundImage: `url('${process.env.PUBLIC_URL}/pinimg.png')` }}></div>

                  <img src={`${process.env.PUBLIC_URL}/${card.img}`} alt="memory" className="polaroid-img" />
                  <div className="polaroid-caption">{card.msg}</div>
                </motion.div>
              ))}

              {/* THE FINAL LETTER */}
              <motion.div 
                className="letter-container"
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1 }}
              >
                <div className="pin" style={{ backgroundImage: `url('${process.env.PUBLIC_URL}/pinimg.png')` }}></div>
                <div className="letter-title">{LETTER_CONTENT.title}</div>
                <div className="letter-body">
                   {LETTER_CONTENT.body}
                </div>
                <div className="signature">{LETTER_CONTENT.sender}</div>
              </motion.div>

              {/* Buffer at bottom */}
              <div style={{ height: '100px' }}></div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}

export default App;