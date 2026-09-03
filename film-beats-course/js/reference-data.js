/* Film Beats course — glossary & how-to reference data.
   Single source of truth for every "Learn more" popup in the site.
   type: "term" (short definition) or "howto" (numbered steps).
   confidence: "verified" | "moderate" | "unverified" | "" (not applicable, e.g. definitions of general music terms) */

const REFERENCE = [
  {
    id: "beat",
    type: "term",
    title: "Beat",
    confidence: "",
    body: `<p>The pulse you'd tap your foot to. Everything else in Part 0 (bar, BPM) is built from this one idea.</p>`
  },
  {
    id: "bpm",
    type: "term",
    title: "BPM (beats per minute)",
    confidence: "",
    body: `<p>How fast the beats come. 60 BPM = one beat per second. Most of the boom-bap / Public Service Broadcasting territory this course lives in sits between 80 and 95 BPM.</p>`
  },
  {
    id: "bar",
    type: "term",
    title: "Bar (measure)",
    confidence: "",
    body: `<p>A group of beats — almost always 4. Count <code>1-2-3-4</code>; every time you land back on <code>1</code>, a new bar has started. Roland's manual calls this a <strong>measure</strong> — same thing.</p>
      <p><strong>4 bars</strong> = <code>1-2-3-4</code> four times = 16 beats. It's the default loop length in sample-based music because most phrases resolve on a 4-bar cycle.</p>
      <p><strong>Seconds per bar</strong> = 240 ÷ BPM. <strong>4 bars</strong> = 960 ÷ BPM.</p>
      <table>
        <thead><tr><th>BPM</th><th>1 bar</th><th>4 bars</th></tr></thead>
        <tbody>
          <tr><td>70</td><td>3.43 s</td><td>13.7 s</td></tr>
          <tr><td>80</td><td>3.00 s</td><td>12.0 s</td></tr>
          <tr><td>90</td><td>2.67 s</td><td>10.7 s</td></tr>
          <tr><td>120</td><td>2.00 s</td><td>8.0 s</td></tr>
          <tr><td>140</td><td>1.71 s</td><td>6.9 s</td></tr>
        </tbody>
      </table>
      <p>This is also how you spot a "wrong" sample: grab 9 seconds at 90 BPM and you have roughly 3.4 bars, which is why it won't loop cleanly.</p>`
  },
  {
    id: "finding-4-bars",
    type: "howto",
    title: "How to find 4 bars in a film cue",
    confidence: "",
    body: `<ol>
      <li>Play the cue.</li>
      <li>Tap along until the pulse feels obvious.</li>
      <li>Count <code>1-2-3-4</code> repeatedly.</li>
      <li>Note where a <code>1</code> lands that feels like the start of a phrase — usually where a melody or chord change begins.</li>
      <li>Count four full cycles from there. That's your loop.</li>
    </ol>
    <p>If you genuinely can't find a pulse (much orchestral score is rubato or in 3), don't force it: grab the phrase you like, and let the SP work out the tempo afterwards with <button class="term" data-ref="bpm-set-auto">BPM SET → AUTO</button>.</p>`
  },
  {
    id: "gate",
    type: "term",
    title: "Gate (playback mode)",
    confidence: "",
    body: `<p>The sample plays only while your finger is on the pad. Toggled globally with <kbd>[GATE]</kbd>. Use for chops and stabs.</p>`
  },
  {
    id: "one-shot",
    type: "term",
    title: "One-shot (playback mode)",
    confidence: "",
    body: `<p>One press plays the sample all the way through; further presses are ignored until it finishes. Use for drum hits and dialogue lines you don't want retriggering.</p>`
  },
  {
    id: "loop-mode",
    type: "term",
    title: "Loop (playback mode)",
    confidence: "",
    body: `<p>Repeats until stopped. Use for drones and 4-bar beds.</p>`
  },
  {
    id: "sample-resample",
    type: "term",
    title: "Sample vs. resample",
    confidence: "",
    body: `<p><strong>Sampling</strong> = recording audio coming <em>into</em> the SP (film audio, the Grandmother, a mic).</p>
      <p><strong>Resampling</strong> = recording the SP's own output back into itself, printing whatever combination of pads and effects is playing into one new sample. It's destructive in the sense you can't unpick it afterwards — the individual parts survive on their original pads, but the resampled version is one fused audio file.</p>`
  },
  {
    id: "transient",
    type: "term",
    title: "Transient",
    confidence: "",
    body: `<p>The sharp attack at the front of a sound — the stick hitting the drum, the door slamming. Transient detection is how the SP finds chop points automatically: it looks for sudden level jumps. Film atmos and orchestral swells have weak transients, so transient-based auto-chop works poorly on them — level-based or equal-division chopping works better there.</p>`
  },
  {
    id: "quantise",
    type: "term",
    title: "Quantise",
    confidence: "",
    body: `<p>Snapping your played timing to a grid (nearest 1/16 note, etc.). Full quantise makes things machine-tight and lifeless. This course deliberately asks you to leave one part unquantised each week — nudging one element off-grid is most of what makes sample-based music feel human.</p>`
  },
  {
    id: "gain-staging",
    type: "term",
    title: "Gain staging",
    confidence: "",
    body: `<p>Setting levels once, at the input, before recording. A sample recorded too quietly can't be fixed by turning it up later — you amplify the noise floor with it. Recorded too loud, it clips permanently. Aim for peaks around three-quarters of the meter, never touching the top.</p>`
  },
  {
    id: "dawless",
    type: "term",
    title: "Dawless",
    confidence: "",
    body: `<p>Making music without a computer-based Digital Audio Workstation (DAW) in the signal path — hardware samplers, synths and drum machines only. The laptop in this course is a playback source for film audio, not a DAW, so it doesn't break the dawless principle — same role a record player has for a crate digger.</p>`
  },
  {
    id: "skip-back",
    type: "howto",
    title: "Skip-back sampling",
    confidence: "verified",
    body: `<p>Captures audio that has <strong>already passed through the input</strong>. You watch the film normally; when something good goes by, you grab it retrospectively — no pre-arming, no hitting record in time.</p>
      <p><strong>How it works:</strong> the SP continuously writes incoming audio to a circular buffer. Anything older than the buffer length (25 s default, 40 s with <button class="term" data-ref="sbs-long">SBS Long</button>) is erased. The buffer only runs when incoming audio exceeds the Auto Trig Level threshold.</p>
      <ol>
        <li>Confirm MARK Function is set to skip-back, not looper (<kbd>SHIFT</kbd> + <kbd>[VALUE]</kbd> toggles).</li>
        <li>Press <kbd>[EXT SOURCE]</kbd> to turn the external input on, and start the film playing.</li>
        <li><strong>Watch the <kbd>[MARK]</kbd> button.</strong> It blinks when skip-back memory is recording. If it isn't blinking, nothing is being captured — raise the input level, or lower the Auto Trig Level threshold.</li>
        <li>When you hear something worth keeping, wait for it to finish, then press <kbd>[MARK]</kbd>. "SKIP BACK…" appears and the buffer's waveform is drawn.</li>
        <li><strong>Preview it:</strong> press <kbd>[SUB PAD]</kbd>. With <kbd>[GATE]</kbd> on, it plays only while you hold it.</li>
        <li>Press <kbd>[REC]</kbd>. "Select Pad To Save" appears; empty pads blink red.</li>
        <li>Press a pad. The audio is now assigned.</li>
      </ol>
      <p class="warn"><strong>Two ways to lose your capture, both permanent:</strong> pressing <kbd>[EXIT]</kbd> before assigning it to a pad, and powering the unit off. The buffer is volatile. <strong>Assign first, audition later.</strong></p>`
  },
  {
    id: "sbs-long",
    type: "term",
    title: "SBS Long",
    confidence: "verified",
    body: `<p>A MARK Function setting (<kbd>SHIFT + pad 13</kbd> → UTILITY → SYSTEM) that raises skip-back memory from 25 to 40 seconds. Extended in firmware v2.00.</p>`
  },
  {
    id: "basic-sampling",
    type: "howto",
    title: "Basic sampling (manual method)",
    confidence: "verified",
    body: `<ol>
      <li>Get into sample mode: press <kbd>[EXIT]</kbd> several times. If you're in pattern mode, press <kbd>[PATTERN SELECT]</kbd>. Pads light orange.</li>
      <li>Press <kbd>[REC]</kbd>. Empty pads flash bright red; pads with samples glow dark red.</li>
      <li>Press <kbd>[RECORD SETTING]</kbd> to open input settings. Set input source, REC LEVEL (raise until peaks sit around three-quarters), LENGTH in measures, and TEMPO if known.</li>
      <li>Press a flashing pad to choose the destination. "WAIT" appears.</li>
      <li>Recording begins automatically when the SP detects audio. Start the film.</li>
      <li>Press the same pad again, or <kbd>[REC]</kbd>, to stop. <kbd>[EXIT]</kbd> cancels.</li>
    </ol>`
  },
  {
    id: "trim",
    type: "howto",
    title: "Trimming a sample",
    confidence: "",
    body: `<ol>
      <li>Select the pad.</li>
      <li>Press <kbd>[START/END]</kbd>. Adjust start and end points against the waveform.</li>
      <li>Pull the start point tight against the first <button class="term" data-ref="transient">transient</button> — even 50 ms of silence at the front makes a sample feel late when you play it.</li>
      <li>Set the playback mode (<button class="term" data-ref="gate">Gate</button> / <button class="term" data-ref="one-shot">One-shot</button> / <button class="term" data-ref="loop-mode">Loop</button>) to suit the material.</li>
    </ol>`
  },
  {
    id: "chop",
    type: "term",
    title: "Chopping",
    confidence: "",
    body: `<p>Slicing one continuous recording into pieces and putting each piece on its own pad, so you can replay them in a new order. It's the central move in sample-based music: you're not playing the original phrase, you're playing an instrument built out of it.</p>`
  },
  {
    id: "lazy-chop",
    type: "howto",
    title: "Lazy chop (play-along marker placement)",
    confidence: "verified",
    body: `<p>One of three ways to place chop markers, reached via <kbd>SHIFT + [START/END]</kbd> → marker setting screen.</p>
      <p>With the sample previewing, press the blinking pads 2–16 at the moments you want a split. Fast and musical — you're performing the chop points in time rather than placing them by eye — but only roughly accurate, since it depends on your reaction speed.</p>
      <p>Compare the other two methods:</p>
      <ul>
        <li><strong>Manual</strong> — position with <kbd>[CTRL 1]</kbd>, press <kbd>[MARK]</kbd> to drop a marker. Precise, slow.</li>
        <li><strong><button class="term" data-ref="auto-mark">AUTO MARK</button></strong> — the SP places markers for you (Time Division / Level / Transient).</li>
      </ul>
      <p>After markers are placed, use <button class="term" data-ref="assign-to-pad">Assign to Pad</button> to put each slice on its own pad.</p>`
  },
  {
    id: "auto-mark",
    type: "howto",
    title: "AUTO MARK (automatic chop markers)",
    confidence: "verified",
    body: `<p>From the marker setting screen (<kbd>SHIFT + [START/END]</kbd>), press <kbd>[VALUE]</kbd> → select AUTO MARK. Three modes:</p>
      <ul>
        <li><strong>TIME DIVISION</strong> — 2 to 16 equal slices. The one to use for orchestral score: set 16 on a 4-bar loop and you get one slice per 1/16 note.</li>
        <li><strong>LEVEL</strong> — 1 to 10, places markers where audio exceeds a set level.</li>
        <li><strong>TRANSIENT</strong> — Hard / Mid / Soft. Good for percussive material, poor for strings and atmos (weak transients).</li>
      </ul>`
  },
  {
    id: "assign-to-pad",
    type: "howto",
    title: "Assign chop markers to pads",
    confidence: "verified",
    body: `<ol>
      <li>Press <kbd>[VALUE]</kbd> → select <strong>ASSIGN TO PAD</strong> → press <kbd>[VALUE]</kbd>.</li>
      <li>Pad colours: empty pads blink yellow, selected pads go green, occupied pads are dark orange.</li>
      <li><kbd>[CTRL 2]</kbd> sets Gate on/off for the slices — Gate on is usually right for chops.</li>
      <li><kbd>[CTRL 3]</kbd> arranges the split order.</li>
      <li><kbd>[MARK]</kbd> executes.</li>
    </ol>`
  },
  {
    id: "vinyl-vari",
    type: "term",
    title: "VINYL mode vs. VARI mode",
    confidence: "verified",
    body: `<p>Two pitch/speed behaviours under <kbd>[PITCH/SPEED]</kbd> (toggle with <kbd>SHIFT + [VALUE]</kbd> knob on that screen):</p>
      <ul>
        <li><strong>VINYL mode ON</strong> — pitch and speed are locked together, like changing the speed of a record. Slower = lower and longer. The tape-like sound most associated with this genre.</li>
        <li><strong>VINYL mode OFF (VARI mode)</strong> — pitch and speed are independent. You can drop a sample an octave without it getting longer.</li>
      </ul>`
  },
  {
    id: "stretch-algorithm",
    type: "term",
    title: "Stretch algorithm: Backing vs. Ensemble",
    confidence: "verified",
    body: `<p>From firmware v2.00, VariPhrase-based time-stretch algorithms, selected with <kbd>SHIFT + [VALUE]</kbd> in the pitch/speed menu:</p>
      <ul>
        <li><strong>Backing</strong> — for sharp attacks. Drums, foley hits.</li>
        <li><strong>Ensemble</strong> — for sustained material. Bass, pads, strings, drones.</li>
      </ul>
      <p>Choosing the wrong one is the usual cause of stretched samples sounding smeared.</p>`
  },
  {
    id: "bpm-set-auto",
    type: "term",
    title: "BPM SET — AUTO vs. MANU",
    confidence: "verified",
    body: `<p>With <kbd>[PITCH/SPEED]</kbd> open, BPM SET → <strong>AUTO</strong> analyses the sample and sets its BPM automatically. If it guesses wrong — common with orchestral material — switch to <strong>MANU</strong> and enter the tempo yourself.</p>`
  },
  {
    id: "envelope",
    type: "term",
    title: "Envelope (Attack / Hold / Release)",
    confidence: "verified",
    body: `<p>Opened with <kbd>SHIFT + [PITCH/SPEED]</kbd>. Shapes how a sample's volume moves over time after it triggers. Short release suits hats and short percussive hits; longer release suits kicks and sustained sounds.</p>
      <p>On the Grandmother this is a full ADSR (Attack / Decay / Sustain / Release) envelope generator, patchable to the filter and VCA.</p>`
  },
  {
    id: "chromatic-mode",
    type: "howto",
    title: "Chromatic mode",
    confidence: "verified",
    body: `<p>Sample one note, then press <kbd>SHIFT + pad 4</kbd> to enter chromatic mode — pads 1–16 now play that single sample across a chromatic scale. You get a playable instrument from one sample instead of recording twelve.</p>
      <p><strong>The trade-off:</strong> it's pitch-shifting one recording, so notes far from the original pick up artefacts, and it occupies the pads for one sample at a time. If you need a bass line you can play while other pads are firing, sample individual notes the old way instead — four or five notes across a fifth is usually enough.</p>`
  },
  {
    id: "resample-routing",
    type: "term",
    title: "Resample routing: Mix vs. ExtIn",
    confidence: "verified",
    body: `<p>Set when you press <kbd>[RESAMPLE]</kbd>: <strong>Mix</strong> samples everything the SP is currently outputting (all pads + effects) — use this to glue your own pattern into one sample. <strong>ExtIn</strong> samples only the external input while the pattern plays underneath.</p>`
  },
  {
    id: "resample-pattern",
    type: "howto",
    title: "Resample a whole pattern",
    confidence: "verified",
    body: `<ol>
      <li>Play the pattern.</li>
      <li>Press <kbd>[RESAMPLE]</kbd>.</li>
      <li>Set <strong>ROUTING</strong> to <button class="term" data-ref="resample-routing">Mix</button> to capture everything the SP is outputting.</li>
      <li>Record a full pattern cycle. Assign to a pad.</li>
    </ol>
    <p class="warn"><strong>The trade:</strong> you can't unpick it afterwards. What you get is one coherent artefact instead of eight separate sounds each with their own noise floor and stereo image — in this idiom, that coherence is usually worth more than the flexibility. The original pads still exist if you need to rebuild.</p>`
  },
  {
    id: "midi-clock",
    type: "howto",
    title: "MIDI clock sync (SP → Grandmother)",
    confidence: "verified",
    body: `<p>The SP sends timing pulses down the MIDI cable; the Grandmother's arpeggiator advances in step with them, so the arp locks to your pattern tempo instead of drifting.</p>
      <ol>
        <li>Connect SP <kbd>MIDI OUT</kbd> (3.5&nbsp;mm TRS, Type‑A) → Grandmother <kbd>MIDI IN</kbd> (5‑pin DIN), using a <button class="term" data-ref="trs-din-cable">Type‑A TRS‑to‑DIN cable</button>.</li>
        <li>On the SP: <kbd>SHIFT + pad 13</kbd> → UTILITY → <kbd>[VALUE]</kbd> → SYSTEM → press <kbd>[VALUE]</kbd> → <kbd>[CTRL 3]</kbd> to the <strong>MIDI</strong> tab → set MIDI Sync so the SP transmits clock (SP as master) → <kbd>[EXIT]</kbd>.</li>
        <li>On the Grandmother: enable the arpeggiator/sequencer to follow MIDI clock and start/stop, via Global Settings (hold <kbd>SYNC</kbd> and press specific keyboard keys — see the Grandmother manual's Global Settings section for the key map). Confirm the MIDI channel matches (Grandmother default is channel 1).</li>
        <li><strong>Sanity check:</strong> start a pattern on the SP, press PLAY on the Grandmother's arpeggiator. If it's following, the arp rate knob now selects note divisions (1/4, 1/8, 1/16) rather than a free-running speed.</li>
      </ol>`
  },
  {
    id: "trs-din-cable",
    type: "term",
    title: "TRS-to-DIN MIDI cable, Type-A",
    confidence: "verified",
    body: `<p>The SP‑404MK2's MIDI ports are 3.5&nbsp;mm TRS <strong>Type‑A</strong> (Roland lists BCC‑1‑3535 / BCC‑2‑3535 for this unit). The Grandmother uses standard 5‑pin DIN. <strong>Type‑B adapters (Korg, Arturia, Make Noise on some units) will not work</strong> — buy one that explicitly says Type‑A.</p>`
  },
  {
    id: "ladder-filter",
    type: "term",
    title: "Ladder filter (LPF)",
    confidence: "",
    body: `<p>The Grandmother's low-pass filter — a classic Moog transistor-ladder design. <strong>Cutoff</strong> sets the frequency above which sound is progressively removed; <strong>resonance</strong> emphasises the frequencies right at the cutoff point, and at high settings can self-oscillate into a tone of its own.</p>`
  },
  {
    id: "spring-reverb",
    type: "term",
    title: "Spring reverb",
    confidence: "",
    body: `<p>The Grandmother's built-in reverb, made with a real physical spring (not a digital model) that the audio signal vibrates. It's the instrument's signature sound — a distinctive metallic "boing" character, especially on transients, that digital reverbs don't quite replicate.</p>`
  },
  {
    id: "drone",
    type: "term",
    title: "Drone",
    confidence: "",
    body: `<p>A sustained note or chord held for a long time, usually with slow internal movement (slight detuning, filter drift) rather than a rhythmic pattern. Used as a bed/texture layer under other material.</p>`
  },
  {
    id: "vca",
    type: "term",
    title: "VCA (Voltage-Controlled Amplifier)",
    confidence: "",
    body: `<p>The stage that actually lets sound through to the output, controlled by the envelope generator. On the Grandmother, the envelope only opens the VCA when a note is played — which is why external audio patched through the synth (Week 3) may need a key held down to be heard continuously, unless you patch around the VCA/envelope.</p>`
  },
  {
    id: "public-domain",
    type: "term",
    title: "Public domain / clearable sources",
    confidence: "moderate",
    body: `<p>Sampling a commercial film without a licence and releasing the result is copyright infringement, in two directions: the film's soundtrack recording, and any underlying musical composition. This is settled law, not a grey area — what varies is enforcement, and low enforcement risk on a small release is not the same as permission.</p>
      <p><strong>Clearable sources for this course (Week 5):</strong></p>
      <ul>
        <li><strong>Prelinger Archives</strong> (archive.org) — mid-century American industrial, educational, advertising and government film; the bulk of the collection is public domain and reuse is explicitly encouraged. <em>High confidence on the collection's general status; check the item page — the collection is not uniformly PD.</em></li>
        <li><strong>NASA</strong> — NASA-produced material is generally not protected by copyright, but NASA doesn't own third-party content that appears in it (e.g. licensed music in produced videos), and the NASA insignia/name can't be used in ways implying endorsement.</li>
        <li><strong>archive.org moving image collections more broadly</strong> — mixed licensing. Check the rights statement on each item; "it's on archive.org" is not a licence.</li>
        <li><strong>Australian archival (NFSA, Film Australia)</strong> — mostly licensed, not free. Assume you need permission unless a specific item says otherwise.</li>
      </ul>`
  },
  {
    id: "pattern-record",
    type: "howto",
    title: "Record a pattern in real time",
    confidence: "verified",
    body: `<ol>
      <li>Press <kbd>[PATTERN SELECT]</kbd>.</li>
      <li>Press <kbd>[REC]</kbd>. Pads with no pattern blink red.</li>
      <li>Press a blinking pad — that's your destination pattern. The unit enters record standby and shows the RECORD SETTING screen.</li>
      <li>Set pattern length (in measures) and quantise. Turn the metronome and count-in on if you want them.</li>
      <li>Press <kbd>[REC]</kbd> to start recording. Play the pads in time.</li>
      <li>Leave one part unquantised — see <button class="term" data-ref="quantise">Quantise</button>.</li>
    </ol>`
  },
  {
    id: "pattern-chaining",
    type: "term",
    title: "Pattern chaining",
    confidence: "unverified",
    body: `<p>Playing several recorded patterns back-to-back in a defined order to build a full arrangement (intro → main → breakdown → outro), rather than looping one pattern forever. The exact mechanics — and pattern-length editing — differ enough between SP‑404MK2 firmware versions that this course points you to your unit's own manual rather than guessing a specific button sequence. Check yours: <kbd>SHIFT + pad 13</kbd> → UTILITY → SYSTEM tells you the firmware version.</p>`
  },
  {
    id: "tr-rec",
    type: "term",
    title: "TR-REC (step recording)",
    confidence: "verified",
    body: `<p>An alternative to playing a pattern in real time: at record standby, press <kbd>[REMAIN]</kbd> to enter step-recording mode, where you place hits on a grid one step at a time instead of performing them.</p>`
  },
  {
    id: "live-mode",
    type: "term",
    title: "Live mode (lock buttons)",
    confidence: "verified",
    body: `<p>Entered with <kbd>SHIFT</kbd> + long-press <kbd>[REMAIN]</kbd> for 3 seconds. Changes how pad presses behave during a pattern for live performance manipulation.</p>`
  },
  {
    id: "djfx-looper",
    type: "term",
    title: "DJFX Looper",
    confidence: "",
    body: `<p>One of the SP-404MK2's performance effects — captures a short loop of the live output and lets you stutter, retrigger, or manipulate it in real time. Used in Week 6 as one of the three performance moves in the final take.</p>`
  },
  {
    id: "utility-menu",
    type: "howto",
    title: "Open the Utility / System menu",
    confidence: "verified",
    body: `<ol>
      <li>Press <kbd>SHIFT + pad 13</kbd> → UTILITY screen.</li>
      <li>Turn <kbd>[VALUE]</kbd> knob → select SYSTEM → press <kbd>[VALUE]</kbd>.</li>
      <li>Turn <kbd>[CTRL 3]</kbd> to move between tabs (MIDI tab, MARK Function, etc).</li>
      <li><kbd>[EXIT]</kbd> to back out.</li>
    </ol>
    <p>This is also where you check your firmware version, referenced throughout this course.</p>`
  }
];

// Build a lookup map for fast access from any page.
const REFERENCE_MAP = Object.fromEntries(REFERENCE.map(e => [e.id, e]));
