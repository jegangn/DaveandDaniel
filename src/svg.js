export const banji = (state = "idle") => `<svg class="mascot banji ${state}" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-label="Banji the canary">
<g class="tail">
<path d="M78 150 Q 64 168 56 184 Q 78 180 100 174 Q 122 180 144 184 Q 136 168 122 150 Z" fill="#FFD445" stroke="#4A3522" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>
<path d="M88 168 L 86 180 M 100 170 L 100 182 M 112 168 L 114 180" stroke="#4A3522" stroke-width="2" stroke-linecap="round" fill="none"/>
<path d="M78 152 Q 80 162 86 168" stroke="#E5A722" stroke-width="2" stroke-linecap="round" fill="none"/>
<path d="M122 152 Q 120 162 114 168" stroke="#E5A722" stroke-width="2" stroke-linecap="round" fill="none"/>
</g>
<g class="leg-l">
<path d="M88 162 L 84 178" stroke="#FF8A3D" stroke-width="5.5" stroke-linecap="round"/>
<path d="M84 178 L 78 184 M 84 178 L 84 186 M 84 178 L 90 184" stroke="#FF8A3D" stroke-width="3.5" stroke-linecap="round" fill="none"/>
<path d="M84 178 L 78 184 M 84 178 L 84 186 M 84 178 L 90 184" stroke="#4A3522" stroke-width="1.2" stroke-linecap="round" fill="none"/>
</g>
<g class="leg-r">
<path d="M112 162 L 116 178" stroke="#FF8A3D" stroke-width="5.5" stroke-linecap="round"/>
<path d="M116 178 L 110 184 M 116 178 L 116 186 M 116 178 L 122 184" stroke="#FF8A3D" stroke-width="3.5" stroke-linecap="round" fill="none"/>
<path d="M116 178 L 110 184 M 116 178 L 116 186 M 116 178 L 122 184" stroke="#4A3522" stroke-width="1.2" stroke-linecap="round" fill="none"/>
</g>
<g class="body">
<ellipse cx="100" cy="128" rx="46" ry="40" fill="#FFD445" stroke="#4A3522" stroke-width="4"/>
<ellipse cx="100" cy="138" rx="28" ry="22" fill="#FFE383"/>
<ellipse cx="84" cy="118" rx="6" ry="4" fill="#FFE89B" opacity="0.7"/>
</g>
<g class="wing-l">
<path d="M68 108 Q 40 118 38 148 Q 54 156 70 138 Q 76 122 72 108 Z" fill="#FF8A3D" stroke="#4A3522" stroke-width="3.5" stroke-linejoin="round"/>
<path d="M48 130 L 60 134 M 52 142 L 64 144" stroke="#4A3522" stroke-width="1.5" fill="none" stroke-linecap="round"/>
</g>
<g class="wing-r">
<path d="M132 108 Q 160 118 162 148 Q 146 156 130 138 Q 124 122 128 108 Z" fill="#FF8A3D" stroke="#4A3522" stroke-width="3.5" stroke-linejoin="round"/>
<path d="M152 130 L 140 134 M 148 142 L 136 144" stroke="#4A3522" stroke-width="1.5" fill="none" stroke-linecap="round"/>
</g>
<g class="head">
<circle cx="100" cy="72" r="36" fill="#FFD445" stroke="#4A3522" stroke-width="4"/>
<ellipse cx="74" cy="84" rx="6" ry="4" fill="#FF9FAE" opacity="0.75"/>
<ellipse cx="126" cy="84" rx="6" ry="4" fill="#FF9FAE" opacity="0.75"/>
<g class="brow-l">
<g class="brow-state idle"><path d="M76 56 Q 84 53 92 56" stroke="#4A3522" stroke-width="3" stroke-linecap="round" fill="none"/></g>
<g class="brow-state up"><path d="M76 50 Q 84 46 92 50" stroke="#4A3522" stroke-width="3" stroke-linecap="round" fill="none"/></g>
</g>
<g class="brow-r">
<g class="brow-state idle"><path d="M108 56 Q 116 53 124 56" stroke="#4A3522" stroke-width="3" stroke-linecap="round" fill="none"/></g>
<g class="brow-state up"><path d="M108 50 Q 116 46 124 50" stroke="#4A3522" stroke-width="3" stroke-linecap="round" fill="none"/></g>
</g>
<g class="eye-l">
<g class="eye-state idle">
<ellipse cx="86" cy="70" rx="7" ry="9" fill="#FFFFFF" stroke="#4A3522" stroke-width="2.5"/>
<circle cx="87" cy="72" r="4.2" fill="#2A1F18"/>
<circle cx="89" cy="69" r="1.6" fill="#FFFFFF"/>
</g>
<g class="eye-state super-happy"><path d="M79 71 Q 86 64 93 71" stroke="#4A3522" stroke-width="3.5" stroke-linecap="round" fill="none"/></g>
<g class="eye-state dizzy">
<circle cx="86" cy="70" r="8" fill="#FFFFFF" stroke="#4A3522" stroke-width="2.5"/>
<path d="M86 70 m -5 0 a 5 5 0 1 0 10 0 a 3 3 0 1 0 -6 0 a 1.5 1.5 0 1 0 3 0" stroke="#4A3522" stroke-width="1.8" fill="none"/>
</g>
<g class="eye-state surprised">
<circle cx="86" cy="70" r="9" fill="#FFFFFF" stroke="#4A3522" stroke-width="2.5"/>
<circle cx="86" cy="70" r="5" fill="#2A1F18"/>
<circle cx="88" cy="68" r="1.8" fill="#FFFFFF"/>
</g>
</g>
<g class="eye-r">
<g class="eye-state idle">
<ellipse cx="114" cy="70" rx="7" ry="9" fill="#FFFFFF" stroke="#4A3522" stroke-width="2.5"/>
<circle cx="115" cy="72" r="4.2" fill="#2A1F18"/>
<circle cx="117" cy="69" r="1.6" fill="#FFFFFF"/>
</g>
<g class="eye-state super-happy"><path d="M107 71 Q 114 64 121 71" stroke="#4A3522" stroke-width="3.5" stroke-linecap="round" fill="none"/></g>
<g class="eye-state dizzy">
<circle cx="114" cy="70" r="8" fill="#FFFFFF" stroke="#4A3522" stroke-width="2.5"/>
<path d="M114 70 m -5 0 a 5 5 0 1 0 10 0 a 3 3 0 1 0 -6 0 a 1.5 1.5 0 1 0 3 0" stroke="#4A3522" stroke-width="1.8" fill="none"/>
</g>
<g class="eye-state surprised">
<circle cx="114" cy="70" r="9" fill="#FFFFFF" stroke="#4A3522" stroke-width="2.5"/>
<circle cx="114" cy="70" r="5" fill="#2A1F18"/>
<circle cx="116" cy="68" r="1.8" fill="#FFFFFF"/>
</g>
</g>
<g class="mouth">
<g class="mouth-state idle">
<path d="M91 86 L 100 92 L 109 86 Z" fill="#FF8A3D" stroke="#4A3522" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M91 86 L 109 86" stroke="#4A3522" stroke-width="1.5" stroke-linecap="round"/>
</g>
<g class="mouth-state happy"><path d="M91 86 Q 100 96 109 86 Q 105 92 100 92 Q 95 92 91 86 Z" fill="#FF8A3D" stroke="#4A3522" stroke-width="2.5" stroke-linejoin="round"/></g>
<g class="mouth-state super-happy">
<path d="M88 84 Q 100 102 112 84 Q 108 96 100 96 Q 92 96 88 84 Z" fill="#FF8A3D" stroke="#4A3522" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M93 91 Q 100 94 107 91" stroke="#FFB780" stroke-width="1.5" fill="none" stroke-linecap="round"/>
</g>
<g class="mouth-state dizzy"><path d="M91 90 Q 95 86 100 90 Q 105 94 109 90" stroke="#4A3522" stroke-width="2.5" stroke-linecap="round" fill="none"/></g>
<g class="mouth-state surprised"><ellipse cx="100" cy="90" rx="4" ry="5" fill="#FF8A3D" stroke="#4A3522" stroke-width="2.5"/></g>
</g>
<g class="hat">
<path d="M62 52 Q 60 28 100 26 Q 140 28 138 52 Q 132 56 100 56 Q 68 56 62 52 Z" fill="#FF8A3D" stroke="#4A3522" stroke-width="3.5" stroke-linejoin="round"/>
<path d="M66 40 Q 100 36 134 40" stroke="#F7E9C0" stroke-width="6" stroke-linecap="round" fill="none"/>
<path d="M66 40 Q 100 36 134 40" stroke="#4A3522" stroke-width="1" stroke-linecap="round" fill="none" opacity="0.4"/>
<path d="M62 52 Q 100 56 138 52" stroke="#4A3522" stroke-width="1.8" fill="none"/>
<circle cx="100" cy="20" r="9" fill="#F7E9C0" stroke="#4A3522" stroke-width="3"/>
<circle cx="97" cy="18" r="1.4" fill="#4A3522" opacity="0.35"/>
<circle cx="102" cy="22" r="1.4" fill="#4A3522" opacity="0.35"/>
<circle cx="100" cy="18" r="1.4" fill="#4A3522" opacity="0.35"/>
<path d="M100 26 L 100 30" stroke="#4A3522" stroke-width="2" stroke-linecap="round"/>
</g>
</g>
</svg>`;

export const mo = (state = "idle") => `<svg class="mascot mo ${state}" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-label="Mo the axolotl">
<g class="tail">
<path d="M148 122 Q 184 116 192 138 Q 184 162 148 152 Q 144 138 148 122 Z" fill="#F4D6CC" stroke="#3A2A3B" stroke-width="4" stroke-linejoin="round"/>
<path d="M156 130 Q 174 138 172 148" stroke="#3A2A3B" stroke-width="1.5" fill="none" stroke-linecap="round"/>
<ellipse cx="172" cy="138" rx="5" ry="8" fill="#FBEFE9" opacity="0.85"/>
</g>
<g class="leg-l">
<ellipse cx="74" cy="166" rx="10" ry="7" fill="#F4D6CC" stroke="#3A2A3B" stroke-width="3.5"/>
<path d="M68 170 L 64 174 M 74 172 L 74 176 M 80 170 L 84 174" stroke="#3A2A3B" stroke-width="2" stroke-linecap="round" fill="none"/>
</g>
<g class="leg-r">
<ellipse cx="120" cy="166" rx="10" ry="7" fill="#F4D6CC" stroke="#3A2A3B" stroke-width="3.5"/>
<path d="M114 170 L 110 174 M 120 172 L 120 176 M 126 170 L 130 174" stroke="#3A2A3B" stroke-width="2" stroke-linecap="round" fill="none"/>
</g>
<g class="body">
<ellipse cx="100" cy="132" rx="50" ry="36" fill="#F4D6CC" stroke="#3A2A3B" stroke-width="4"/>
<ellipse cx="100" cy="144" rx="34" ry="22" fill="#FBEFE9"/>
<ellipse cx="72" cy="118" rx="4" ry="6" fill="#5FB8B8" opacity="0.55"/>
<ellipse cx="124" cy="120" rx="3.5" ry="5" fill="#5FB8B8" opacity="0.55"/>
<ellipse cx="92" cy="112" rx="2.5" ry="3.5" fill="#5FB8B8" opacity="0.4"/>
</g>
<g class="arm-l">
<path d="M62 120 Q 46 134 44 158 Q 54 162 60 156 Q 70 144 76 132 Z" fill="#F4D6CC" stroke="#3A2A3B" stroke-width="3.5" stroke-linejoin="round"/>
<path d="M44 160 L 40 165 M 50 162 L 48 168 M 54 162 L 56 168" stroke="#3A2A3B" stroke-width="2" stroke-linecap="round" fill="none"/>
</g>
<g class="arm-r">
<path d="M138 120 Q 154 134 156 158 Q 146 162 140 156 Q 130 144 124 132 Z" fill="#F4D6CC" stroke="#3A2A3B" stroke-width="3.5" stroke-linejoin="round"/>
<path d="M156 160 L 160 165 M 150 162 L 152 168 M 146 162 L 144 168" stroke="#3A2A3B" stroke-width="2" stroke-linecap="round" fill="none"/>
</g>
<g class="head">
<g class="gill-l">
<path d="M68 60 Q 48 50 32 38 Q 44 40 58 54 Q 64 58 68 60 Z" fill="#FF7A8E" stroke="#3A2A3B" stroke-width="3" stroke-linejoin="round"/>
<path d="M62 76 Q 38 76 22 72 Q 36 86 56 82 Q 62 80 62 76 Z" fill="#FF7A8E" stroke="#3A2A3B" stroke-width="3" stroke-linejoin="round"/>
<path d="M66 90 Q 46 100 34 116 Q 52 110 60 98 Q 66 94 66 90 Z" fill="#FF7A8E" stroke="#3A2A3B" stroke-width="3" stroke-linejoin="round"/>
<path d="M48 46 Q 52 50 54 56" stroke="#FFA3B0" stroke-width="2" fill="none" stroke-linecap="round"/>
<path d="M40 76 Q 48 76 54 78" stroke="#FFA3B0" stroke-width="2" fill="none" stroke-linecap="round"/>
<path d="M50 100 Q 54 98 58 96" stroke="#FFA3B0" stroke-width="2" fill="none" stroke-linecap="round"/>
</g>
<g class="gill-r">
<path d="M132 60 Q 152 50 168 38 Q 156 40 142 54 Q 136 58 132 60 Z" fill="#FF7A8E" stroke="#3A2A3B" stroke-width="3" stroke-linejoin="round"/>
<path d="M138 76 Q 162 76 178 72 Q 164 86 144 82 Q 138 80 138 76 Z" fill="#FF7A8E" stroke="#3A2A3B" stroke-width="3" stroke-linejoin="round"/>
<path d="M134 90 Q 154 100 166 116 Q 148 110 140 98 Q 134 94 134 90 Z" fill="#FF7A8E" stroke="#3A2A3B" stroke-width="3" stroke-linejoin="round"/>
<path d="M152 46 Q 148 50 146 56" stroke="#FFA3B0" stroke-width="2" fill="none" stroke-linecap="round"/>
<path d="M160 76 Q 152 76 146 78" stroke="#FFA3B0" stroke-width="2" fill="none" stroke-linecap="round"/>
<path d="M150 100 Q 146 98 142 96" stroke="#FFA3B0" stroke-width="2" fill="none" stroke-linecap="round"/>
</g>
<ellipse cx="100" cy="76" rx="42" ry="36" fill="#F4D6CC" stroke="#3A2A3B" stroke-width="4"/>
<ellipse cx="100" cy="58" rx="20" ry="6" fill="#FBEFE9" opacity="0.6"/>
<ellipse cx="70" cy="88" rx="7" ry="5" fill="#FFAFBA" opacity="0.65"/>
<ellipse cx="130" cy="88" rx="7" ry="5" fill="#FFAFBA" opacity="0.65"/>
<g class="brow-l">
<g class="brow-state idle"><path d="M76 58 Q 84 55 92 58" stroke="#3A2A3B" stroke-width="3" stroke-linecap="round" fill="none"/></g>
<g class="brow-state up"><path d="M76 52 Q 84 47 92 52" stroke="#3A2A3B" stroke-width="3" stroke-linecap="round" fill="none"/></g>
</g>
<g class="brow-r">
<g class="brow-state idle"><path d="M108 58 Q 116 55 124 58" stroke="#3A2A3B" stroke-width="3" stroke-linecap="round" fill="none"/></g>
<g class="brow-state up"><path d="M108 52 Q 116 47 124 52" stroke="#3A2A3B" stroke-width="3" stroke-linecap="round" fill="none"/></g>
</g>
<g class="eye-l">
<g class="eye-state idle">
<circle cx="86" cy="72" r="7" fill="#3A2A3B"/>
<circle cx="88" cy="69" r="2.6" fill="#FFFFFF"/>
<circle cx="84" cy="74" r="1.1" fill="#FFFFFF"/>
</g>
<g class="eye-state super-happy"><path d="M78 74 Q 86 66 94 74" stroke="#3A2A3B" stroke-width="4" stroke-linecap="round" fill="none"/></g>
<g class="eye-state dizzy">
<circle cx="86" cy="72" r="7.5" fill="#FFFFFF" stroke="#3A2A3B" stroke-width="2.5"/>
<path d="M86 72 m -5 0 a 5 5 0 1 0 10 0 a 3 3 0 1 0 -6 0 a 1.5 1.5 0 1 0 3 0" stroke="#3A2A3B" stroke-width="1.8" fill="none"/>
</g>
<g class="eye-state surprised">
<circle cx="86" cy="72" r="9" fill="#FFFFFF" stroke="#3A2A3B" stroke-width="2.5"/>
<circle cx="86" cy="72" r="5" fill="#3A2A3B"/>
<circle cx="88" cy="70" r="1.8" fill="#FFFFFF"/>
</g>
</g>
<g class="eye-r">
<g class="eye-state idle">
<circle cx="114" cy="72" r="7" fill="#3A2A3B"/>
<circle cx="116" cy="69" r="2.6" fill="#FFFFFF"/>
<circle cx="112" cy="74" r="1.1" fill="#FFFFFF"/>
</g>
<g class="eye-state super-happy"><path d="M106 74 Q 114 66 122 74" stroke="#3A2A3B" stroke-width="4" stroke-linecap="round" fill="none"/></g>
<g class="eye-state dizzy">
<circle cx="114" cy="72" r="7.5" fill="#FFFFFF" stroke="#3A2A3B" stroke-width="2.5"/>
<path d="M114 72 m -5 0 a 5 5 0 1 0 10 0 a 3 3 0 1 0 -6 0 a 1.5 1.5 0 1 0 3 0" stroke="#3A2A3B" stroke-width="1.8" fill="none"/>
</g>
<g class="eye-state surprised">
<circle cx="114" cy="72" r="9" fill="#FFFFFF" stroke="#3A2A3B" stroke-width="2.5"/>
<circle cx="114" cy="72" r="5" fill="#3A2A3B"/>
<circle cx="116" cy="70" r="1.8" fill="#FFFFFF"/>
</g>
</g>
<g class="mouth">
<g class="mouth-state idle"><path d="M92 92 Q 100 99 108 92" stroke="#3A2A3B" stroke-width="3" stroke-linecap="round" fill="none"/></g>
<g class="mouth-state happy"><path d="M88 90 Q 100 104 112 90" stroke="#3A2A3B" stroke-width="3" stroke-linecap="round" fill="none"/></g>
<g class="mouth-state super-happy">
<path d="M86 88 Q 100 106 114 88 Q 110 102 100 102 Q 90 102 86 88 Z" fill="#3A2A3B" stroke="#3A2A3B" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M92 96 Q 100 98 108 96" stroke="#FF8FA0" stroke-width="2" fill="none" stroke-linecap="round"/>
</g>
<g class="mouth-state dizzy"><path d="M91 94 Q 95 90 100 94 Q 105 98 109 94" stroke="#3A2A3B" stroke-width="3" stroke-linecap="round" fill="none"/></g>
<g class="mouth-state surprised"><ellipse cx="100" cy="94" rx="4" ry="5.5" fill="#3A2A3B"/></g>
</g>
</g>
</svg>`;

export const pip = (state = "idle") => `<svg class="mascot pip ${state}" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-label="Pip the fennec fox">
<g class="tail">
<path d="M130 142 Q 170 130 182 156 Q 178 184 144 174 Q 132 168 126 156 Z" fill="#E89A2A" stroke="#5A3F1E" stroke-width="3.5" stroke-linejoin="round"/>
<path d="M170 138 Q 184 156 178 178" stroke="#F8E0A8" stroke-width="10" stroke-linecap="round" fill="none"/>
<path d="M170 138 Q 184 156 178 178" stroke="#5A3F1E" stroke-width="1.4" stroke-linecap="round" fill="none" opacity="0.5"/>
<path d="M150 150 Q 162 158 156 172" stroke="#5A3F1E" stroke-width="1.5" stroke-linecap="round" fill="none" opacity="0.5"/>
</g>
<g class="leg-l">
<ellipse cx="82" cy="174" rx="9" ry="6.5" fill="#E89A2A" stroke="#5A3F1E" stroke-width="3"/>
<ellipse cx="82" cy="175" rx="5" ry="3.5" fill="#F8E0A8"/>
</g>
<g class="leg-r">
<ellipse cx="118" cy="174" rx="9" ry="6.5" fill="#E89A2A" stroke="#5A3F1E" stroke-width="3"/>
<ellipse cx="118" cy="175" rx="5" ry="3.5" fill="#F8E0A8"/>
</g>
<g class="body">
<ellipse cx="100" cy="146" rx="38" ry="30" fill="#E89A2A" stroke="#5A3F1E" stroke-width="4"/>
<ellipse cx="100" cy="154" rx="22" ry="18" fill="#F8E0A8"/>
<circle cx="84" cy="164" r="6" fill="#E89A2A" stroke="#5A3F1E" stroke-width="3"/>
<circle cx="116" cy="164" r="6" fill="#E89A2A" stroke="#5A3F1E" stroke-width="3"/>
<path d="M81 167 L 80 170 M 84 168 L 84 171 M 87 167 L 88 170" stroke="#5A3F1E" stroke-width="1.2" stroke-linecap="round" fill="none"/>
<path d="M113 167 L 112 170 M 116 168 L 116 171 M 119 167 L 120 170" stroke="#5A3F1E" stroke-width="1.2" stroke-linecap="round" fill="none"/>
</g>
<g class="head">
<g class="ear-l">
<path d="M82 90 Q 58 64 54 14 Q 70 16 84 56 Q 90 72 86 88 Z" fill="#E89A2A" stroke="#5A3F1E" stroke-width="4" stroke-linejoin="round"/>
<path d="M82 84 Q 66 58 64 24 Q 74 28 80 56 Q 84 70 82 84 Z" fill="#F8E0A8"/>
<path d="M70 32 Q 76 50 80 64" stroke="#E89A2A" stroke-width="1.5" fill="none" stroke-linecap="round" opacity="0.7"/>
</g>
<g class="ear-r">
<path d="M118 90 Q 142 64 146 14 Q 130 16 116 56 Q 110 72 114 88 Z" fill="#E89A2A" stroke="#5A3F1E" stroke-width="4" stroke-linejoin="round"/>
<path d="M118 84 Q 134 58 136 24 Q 126 28 120 56 Q 116 70 118 84 Z" fill="#F8E0A8"/>
<path d="M130 32 Q 124 50 120 64" stroke="#E89A2A" stroke-width="1.5" fill="none" stroke-linecap="round" opacity="0.7"/>
<g class="accessory">
<path d="M138 60 L 132 50 M 140 56 L 138 48 M 144 54 L 146 46 M 148 58 L 154 50 M 150 62 L 158 60 M 148 66 L 156 70 M 144 68 L 144 76" stroke="#F8D27A" stroke-width="2.5" stroke-linecap="round"/>
<circle cx="142" cy="60" r="6.5" fill="#F8D27A" stroke="#5A3F1E" stroke-width="2"/>
<circle cx="142" cy="60" r="3" fill="#E89A2A"/>
<path d="M142 66 Q 148 78 156 86" stroke="#7AB344" stroke-width="2.5" stroke-linecap="round" fill="none"/>
</g>
</g>
<path d="M68 96 Q 68 64 100 60 Q 132 64 132 96 Q 132 116 116 124 Q 100 130 84 124 Q 68 116 68 96 Z" fill="#E89A2A" stroke="#5A3F1E" stroke-width="4" stroke-linejoin="round"/>
<path d="M80 96 Q 82 110 92 118 Q 100 124 108 118 Q 118 110 120 96 Q 118 102 100 102 Q 82 102 80 96 Z" fill="#F8E0A8"/>
<circle cx="78" cy="102" r="3.5" fill="#FF6B6B" opacity="0.7"/>
<circle cx="122" cy="102" r="3.5" fill="#FF6B6B" opacity="0.7"/>
<g class="brow-l">
<g class="brow-state idle"><path d="M80 80 Q 88 77 94 80" stroke="#5A3F1E" stroke-width="3" stroke-linecap="round" fill="none"/></g>
<g class="brow-state up"><path d="M80 74 Q 88 70 94 74" stroke="#5A3F1E" stroke-width="3" stroke-linecap="round" fill="none"/></g>
</g>
<g class="brow-r">
<g class="brow-state idle"><path d="M106 80 Q 112 77 120 80" stroke="#5A3F1E" stroke-width="3" stroke-linecap="round" fill="none"/></g>
<g class="brow-state up"><path d="M106 74 Q 112 70 120 74" stroke="#5A3F1E" stroke-width="3" stroke-linecap="round" fill="none"/></g>
</g>
<g class="eye-l">
<g class="eye-state idle">
<ellipse cx="86" cy="94" rx="6" ry="8" fill="#2A1F18"/>
<circle cx="88" cy="91" r="2.2" fill="#FFFFFF"/>
<circle cx="85" cy="96" r="1" fill="#FFFFFF"/>
</g>
<g class="eye-state super-happy"><path d="M78 96 Q 86 88 94 96" stroke="#2A1F18" stroke-width="4" stroke-linecap="round" fill="none"/></g>
<g class="eye-state dizzy">
<circle cx="86" cy="94" r="7" fill="#FFFFFF" stroke="#5A3F1E" stroke-width="2.5"/>
<path d="M86 94 m -5 0 a 5 5 0 1 0 10 0 a 3 3 0 1 0 -6 0 a 1.5 1.5 0 1 0 3 0" stroke="#5A3F1E" stroke-width="1.8" fill="none"/>
</g>
<g class="eye-state surprised">
<ellipse cx="86" cy="94" rx="7" ry="9" fill="#FFFFFF" stroke="#5A3F1E" stroke-width="2.5"/>
<ellipse cx="86" cy="94" rx="4" ry="5" fill="#2A1F18"/>
<circle cx="88" cy="92" r="1.5" fill="#FFFFFF"/>
</g>
</g>
<g class="eye-r">
<g class="eye-state idle">
<ellipse cx="114" cy="94" rx="6" ry="8" fill="#2A1F18"/>
<circle cx="116" cy="91" r="2.2" fill="#FFFFFF"/>
<circle cx="113" cy="96" r="1" fill="#FFFFFF"/>
</g>
<g class="eye-state super-happy"><path d="M106 96 Q 114 88 122 96" stroke="#2A1F18" stroke-width="4" stroke-linecap="round" fill="none"/></g>
<g class="eye-state dizzy">
<circle cx="114" cy="94" r="7" fill="#FFFFFF" stroke="#5A3F1E" stroke-width="2.5"/>
<path d="M114 94 m -5 0 a 5 5 0 1 0 10 0 a 3 3 0 1 0 -6 0 a 1.5 1.5 0 1 0 3 0" stroke="#5A3F1E" stroke-width="1.8" fill="none"/>
</g>
<g class="eye-state surprised">
<ellipse cx="114" cy="94" rx="7" ry="9" fill="#FFFFFF" stroke="#5A3F1E" stroke-width="2.5"/>
<ellipse cx="114" cy="94" rx="4" ry="5" fill="#2A1F18"/>
<circle cx="116" cy="92" r="1.5" fill="#FFFFFF"/>
</g>
</g>
<ellipse cx="100" cy="110" rx="4.5" ry="3.5" fill="#2A1F18"/>
<path d="M100 113 L 100 117" stroke="#5A3F1E" stroke-width="2" stroke-linecap="round" fill="none"/>
<g class="mouth">
<g class="mouth-state idle"><path d="M94 118 Q 100 121 106 118" stroke="#5A3F1E" stroke-width="2.5" stroke-linecap="round" fill="none"/></g>
<g class="mouth-state happy"><path d="M91 118 Q 100 126 109 118" stroke="#5A3F1E" stroke-width="2.5" stroke-linecap="round" fill="none"/></g>
<g class="mouth-state super-happy">
<path d="M88 116 Q 100 132 112 116 Q 108 128 100 128 Q 92 128 88 116 Z" fill="#5A3F1E" stroke="#5A3F1E" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M92 122 Q 100 124 108 122" stroke="#FF6B6B" stroke-width="1.5" fill="none" stroke-linecap="round"/>
<path d="M94 119 L 94 122 M 106 119 L 106 122" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round"/>
</g>
<g class="mouth-state dizzy"><path d="M93 120 Q 96 116 100 120 Q 104 124 107 120" stroke="#5A3F1E" stroke-width="2.5" stroke-linecap="round" fill="none"/></g>
<g class="mouth-state surprised"><ellipse cx="100" cy="121" rx="4" ry="5" fill="#5A3F1E"/></g>
</g>
</g>
</svg>`;

export const banana = (state = "default") => `
<svg viewBox="0 0 96 96" class="block banana ${state}">
  <path d="M20,75 q-10,-50 35,-65 q15,5 5,15 q-30,15 -25,55 z" fill="#FFD13A" stroke="#7A4A08" stroke-width="3"/>
  <path d="M55,12 q3,-5 8,-2 q3,3 -2,7 z" fill="#4AAE3F" stroke="#2A1B0A" stroke-width="2"/>
</svg>`;

export const coconut = (state = "default") => `
<svg viewBox="0 0 96 96" class="block coconut ${state}">
  <circle cx="48" cy="50" r="36" fill="#6A3A1A" stroke="#2A1B0A" stroke-width="3"/>
  <g stroke="#3A1F08" stroke-width="2" fill="none">
    <path d="M20,40 q10,8 20,2"/><path d="M55,38 q10,6 22,4"/>
    <path d="M25,55 q12,8 24,2"/><path d="M55,60 q12,6 22,2"/>
  </g>
  <circle cx="40" cy="35" r="3" fill="#FFFAF0"/>
  <circle cx="56" cy="36" r="3" fill="#FFFAF0"/>
</svg>`;

export const mango = (state = "default") => `
<svg viewBox="0 0 96 96" class="block mango ${state}">
  <path d="M48,12 q35,8 32,45 q-3,28 -32,30 q-29,-2 -32,-30 q-3,-37 32,-45 z" fill="#FF7A1A" stroke="#7A2A04" stroke-width="3"/>
  <path d="M30,30 q15,-6 30,2" stroke="#FF3E6B" stroke-width="6" fill="none" stroke-linecap="round"/>
  <ellipse cx="48" cy="13" rx="3" ry="6" fill="#4AAE3F" stroke="#2A1B0A" stroke-width="2"/>
</svg>`;

export const firefly = (state = "default") => `
<svg viewBox="0 0 96 96" class="block firefly ${state}">
  <g class="glow"><circle cx="48" cy="50" r="42" fill="#FFF8C8" opacity="0"/></g>
  <g class="wing-l"><ellipse cx="32" cy="40" rx="22" ry="14" fill="#FFFAF0" opacity=".75"/></g>
  <g class="wing-r"><ellipse cx="64" cy="40" rx="22" ry="14" fill="#FFFAF0" opacity=".75"/></g>
  <g class="body">
    <ellipse cx="48" cy="55" rx="18" ry="22" fill="#FFE680" stroke="#6A4A08" stroke-width="3"/>
    <ellipse cx="48" cy="68" rx="14" ry="10" fill="#FFD13A"/>
    <circle cx="44" cy="48" r="3" fill="#2A1B0A"/>
    <circle cx="52" cy="48" r="3" fill="#2A1B0A"/>
  </g>
</svg>`;

export const star = (filled = true) => `
<svg viewBox="0 0 80 80" class="star ${filled ? 'filled' : 'empty'}">
  <path d="M40,6 L49,29 L73,32 L55,49 L60,73 L40,61 L20,73 L25,49 L7,32 L31,29 Z"
        fill="${filled ? '#FFC83A' : 'transparent'}"
        stroke="#2A1B0A" stroke-width="3" stroke-linejoin="round"
        opacity="${filled ? 1 : 0.35}"/>
</svg>`;

export const padlock = () => `
<svg viewBox="0 0 48 48" class="padlock">
  <g class="shackle"><path d="M14,22 v-6 a10,10 0 0 1 20,0 v6" stroke="#5C4A2A" stroke-width="5" fill="none" stroke-linecap="round"/></g>
  <g class="body">
    <rect x="9" y="20" width="30" height="22" rx="4" fill="#8A6A4A" stroke="#2A1B0A" stroke-width="2"/>
    <circle cx="24" cy="30" r="3" fill="#2A1B0A"/>
    <rect x="22" y="30" width="4" height="8" fill="#2A1B0A"/>
  </g>
</svg>`;

export const lilypad = (tint = "var(--world-sky)") => `
<svg viewBox="0 0 320 280" class="lilypad" preserveAspectRatio="none">
  <ellipse cx="160" cy="140" rx="150" ry="120" fill="${tint}" stroke="#6A4A28" stroke-width="3" opacity=".95"/>
</svg>`;

export const leaf = (rot = 0) => `
<svg viewBox="0 0 60 100" class="leaf" style="transform:rotate(${rot}deg)">
  <path d="M30,5 q25,40 0,90 q-25,-50 0,-90 z" fill="#4AAE3F" stroke="#2A1B0A" stroke-width="2"/>
  <path d="M30,15 v75" stroke="#2A1B0A" stroke-width="1.5" fill="none"/>
</svg>`;

export const confettiShape = (kind = "rect", color = "#FFC83A") => {
  const shapes = {
    rect:   `<rect x="-6" y="-3" width="12" height="6" fill="${color}"/>`,
    tear:   `<path d="M0,-8 q6,5 0,16 q-6,-11 0,-16 z" fill="${color}"/>`,
    circle: `<circle cx="0" cy="0" r="5" fill="${color}"/>`,
    zig:    `<polyline points="-6,-3 -2,3 2,-3 6,3" stroke="${color}" stroke-width="3" fill="none"/>`,
  };
  return `<svg viewBox="-10 -10 20 20" class="confetti">${shapes[kind] || shapes.rect}</svg>`;
};

export const home = () => `
<svg viewBox="0 0 48 48" class="icon home"><path d="M24,6 L42,22 V42 H30 V28 H18 V42 H6 V22 Z" fill="none" stroke="#2A1B0A" stroke-width="4" stroke-linejoin="round"/></svg>`;

export const cog = () => `
<svg viewBox="0 0 48 48" class="icon cog"><g fill="none" stroke="#6A4B28" stroke-width="3"><circle cx="24" cy="24" r="6"/><path d="M24,4 v6 M24,38 v6 M4,24 h6 M38,24 h6 M10,10 l4,4 M34,34 l4,4 M10,38 l4,-4 M34,14 l4,-4"/></g></svg>`;
