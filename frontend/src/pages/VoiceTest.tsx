import { Mic } from "lucide-react";
import { useState, useEffect } from "react";
// import OrbComponent from "../components/OrbAnimation";
// import { cn } from "@/lib/utils";

interface AIVoiceInputProps {
  onStart?: () => void;
  onStop?: (duration: number) => void;
  visualizerBars?: number;
  demoMode?: boolean;
  demoInterval?: number;
  className?: string;
}

function AIVoiceInput({
  onStart,
  onStop,
  visualizerBars = 48,
  demoMode = false,
  demoInterval = 3000,
  className
}: AIVoiceInputProps) {
  const [submitted, setSubmitted] = useState(false);
  const [time, setTime] = useState(0);
  const [isClient, setIsClient] = useState(false);
  const [isDemo, setIsDemo] = useState(demoMode);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    let intervalId: any;

    if (submitted) {
      onStart?.();
      intervalId = setInterval(() => {
        setTime((t) => t + 1);
      }, 1000);
    } else {
      onStop?.(time);
      setTime(0);
    }

    return () => clearInterval(intervalId);
  }, [submitted, time, onStart, onStop]);

  useEffect(() => {
    if (!isDemo) return;

    let timeoutId: any;
    const runAnimation = () => {
      setSubmitted(true);
      timeoutId = setTimeout(() => {
        setSubmitted(false);
        timeoutId = setTimeout(runAnimation, 1000);
      }, demoInterval);
    };

    const initialTimeout = setTimeout(runAnimation, 100);
    return () => {
      clearTimeout(timeoutId);
      clearTimeout(initialTimeout);
    };
  }, [isDemo, demoInterval]);

  const handleClick = () => {
    if (isDemo) {
      setIsDemo(false);
      setSubmitted(false);
    } else {
      setSubmitted((prev) => !prev);
    }
  };

  return (
    <div className={`w-full py-4 bg-[#1f1f1f] flex-col grow h-svh flex  ${className}`}>
      <div className="text-white text-3xl text-center gap-8 grow flex flex-col items-center justify-center">
        {/* <div className={`duration-300 delay-200 ${submitted? 'scale-100':'scale-0'}`}><OrbComponent/></div> */}
        <h3 className={`${submitted? 'opacity-0':'opacity-100'} duration-300 delay-200 text-accent-light`}>Whisper your expenses.</h3>
      </div>
      <div className="relative max-w-xl w-full flex items-center justify-end flex-col gap-2 mt-6">
        <button
          className={
            `group w-16 h-16 rounded-xl flex items-center justify-center transition-colors relative
            ${ submitted
              ? "bg-none"
              : "bg-none hover:bg-black/10 dark:hover:bg-card/10"
            }`
          }
          type="button"
          onClick={handleClick}
        >
            <div
              className={`absolute top-1/2 left-1/2 -translate-1/2 w-6 h-6 rounded-sm animate-spin bg-black dark:bg-card cursor-pointer duration-75 ${submitted? 'pointer-events-auto':'pointer-events-none opacity-0 scale-50'}`}
              style={{ animationDuration: "3s" }}
            />
            <div className={`p-4 rounded-full bg-accent-dark text-white duration-75 ${submitted? 'pointer-events-none opacity-0 scale-50':'pointer-events-auto'}`}>
              <Mic className="w-8 h-8" />
            </div>
        </button>

        {/* <span */}
        {/*   className={ */}
        {/*     `font-mono text-sm transition-opacity duration-300 */}
        {/*       ${submitted */}
        {/*       ? "text-black/70 dark:text-white/70" */}
        {/*       : "text-black/30 dark:text-white/30" */}
        {/*     } */}
        {/*   `} */}
        {/* > */}
        {/*   {formatTime(time)} */}
        {/* </span> */}

        <div className="h-4 w-64 flex items-center justify-center gap-0.5">
          {[...Array(visualizerBars)].map((_, i) => (
            <div
              key={i}
              className={
                `w-0.5 rounded-full transition-all duration-300
                ${submitted
                  ? "bg-black/50 dark:bg-card/50 animate-pulse"
                  : "bg-black/10 dark:bg-card/10 h-1"
                }
              `}
              style={
                submitted && isClient
                  ? {
                      height: `${20 + Math.random() * 80}%`,
                      animationDelay: `${i * 0.05}s`,
                    }
                  : undefined
              }
            />
          ))}
        </div>

        <p className="h-4 text-xs text-black/70 dark:text-white/70">
          {submitted ? "Listening..." : "Click to speak"}
        </p>
      </div>
    </div>
  );
}

export default AIVoiceInput
