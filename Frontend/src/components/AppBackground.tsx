export default function AppBackground() {
  return (
    <div className="fintech-background" aria-hidden="true">
      <div className="fintech-glow" />
      <div className="fintech-grid" />
      <svg
        className="fintech-art"
        viewBox="0 0 1440 900"
        preserveAspectRatio="none"
        fill="none"
        focusable="false"
      >
        <g className="fintech-wave" stroke="currentColor" strokeWidth="1.2">
          <path d="M810 42c70 18 90-31 154-12s78 71 142 58 88-57 151-40 107 52 183 27" />
          <path d="M1110 0c47 22 65 56 112 53s75-25 126-10 67 38 112 28" />
          <path d="M-28 668c47-22 78-19 116 0s61 40 102 23 61-65 105-54 59 54 97 47" />
          <path d="M1154 748c48-21 82-17 119 8s68 31 103 6 52-63 92-50" />
        </g>

        <g className="fintech-network" stroke="currentColor" strokeWidth="1">
          <path d="m18 108 66 42 53-60 69 47 53-31m-175 44-24 67 67 34 52-55 80 38m-175-17 22 72 77 23 51-47 65 33" />
          <path d="m1188 127 64 31 50-57 70 34 67-35m-251 58-25 71 65 37 62-48 73 32m-175-21 28 68 75 21 49-48 70 25" />
          <path d="m72 783 72-37 54 54 66-35 41 41m-233-23 24 67 76 22 56-44 55 39" />
          <path d="m1150 789 61-42 59 49 65-37 74 37m-252-12-18 73 67 20 57-45 74 35" />
          <circle className="fintech-node" cx="18" cy="108" r="3" />
          <circle className="fintech-node" cx="84" cy="150" r="3.5" />
          <circle className="fintech-node" cx="137" cy="90" r="3" />
          <circle className="fintech-node" cx="206" cy="137" r="3.5" />
          <circle className="fintech-node" cx="1150" cy="789" r="3" />
          <circle className="fintech-node" cx="1211" cy="747" r="3.5" />
          <circle className="fintech-node" cx="1270" cy="796" r="3" />
          <circle className="fintech-node" cx="1335" cy="759" r="3.5" />
        </g>

        <g className="fintech-watermarks" fill="currentColor" fontFamily="monospace">
          <text x="74" y="350" fontSize="20">₹</text>
          <text x="1300" y="465" fontSize="14">+4.8%</text>
          <text x="86" y="580" fontSize="9">CREDIT / FLOW</text>
          <text x="1260" y="690" fontSize="9">DATA · 24H</text>
        </g>

        <g className="fintech-bars" stroke="currentColor" strokeWidth="1">
          <path d="M87 818h94m-82 0v-24h12v24m10 0v-39h12v39m10 0v-31h12v31m10 0v-54h12v54" />
          <path d="M1280 225h92m-82 0v-18h12v18m10 0v-41h12v41m10 0v-29h12v29m10 0v-58h12v58" />
        </g>
      </svg>
    </div>
  );
}