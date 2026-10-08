import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement>;
const base = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const;

export const IconSearch = (p: P) => (<svg {...base} {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>);
export const IconMenu = (p: P) => (<svg {...base} {...p}><path d="M4 7h16M4 12h16M4 17h16" /></svg>);
export const IconClose = (p: P) => (<svg {...base} {...p}><path d="M6 6l12 12M18 6 6 18" /></svg>);
export const IconSun = (p: P) => (<svg {...base} {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>);
export const IconMoon = (p: P) => (<svg {...base} {...p}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>);
export const IconHome = (p: P) => (<svg {...base} {...p}><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></svg>);
export const IconMap = (p: P) => (<svg {...base} {...p}><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" /><path d="M9 4v14M15 6v14" /></svg>);
export const IconCards = (p: P) => (<svg {...base} {...p}><rect x="3" y="6" width="14" height="14" rx="2" /><path d="M7 3h12a2 2 0 0 1 2 2v12" /></svg>);
export const IconTimer = (p: P) => (<svg {...base} {...p}><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2 2M9 2h6" /></svg>);
export const IconRadar = (p: P) => (<svg {...base} {...p}><path d="M12 2 21 8.5 17.5 20h-11L3 8.5z" /><path d="M12 7l4.5 3.3-1.7 5.2H9.2L7.5 10.3z" /></svg>);
export const IconBookmark = (p: P) => (<svg {...base} {...p}><path d="M6 3h12v18l-6-4-6 4z" /></svg>);
export const IconCheck = (p: P) => (<svg {...base} {...p}><path d="m5 12 5 5L20 7" /></svg>);
export const IconChevron = (p: P) => (<svg {...base} {...p}><path d="m9 6 6 6-6 6" /></svg>);
export const IconArrowLeft = (p: P) => (<svg {...base} {...p}><path d="M19 12H5M11 18l-6-6 6-6" /></svg>);
export const IconArrowRight = (p: P) => (<svg {...base} {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>);
export const IconKeyboard = (p: P) => (<svg {...base} {...p}><rect x="2" y="6" width="20" height="12" rx="2" /><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" /></svg>);
export const IconFlame = (p: P) => (<svg {...base} {...p}><path d="M12 22c4 0 7-2.7 7-7 0-4-3-6-4-10-2 2-3 4-3 6-1-1-2-2-2-4-3 3-5 5.5-5 8 0 4.3 3 7 7 7z" /></svg>);
