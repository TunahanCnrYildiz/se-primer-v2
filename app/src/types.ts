export type Screen = 'onboarding' | 'scene' | 'ending';

export type Level = 'beginner' | 'intermediate' | 'experienced';
export type Role = 'backend' | 'devops' | 'qa';
export type Goal = 'architecture' | 'testing' | 'privacy';

export type Choice = 'A' | 'B';

export interface PlayerProfile {
  level: Level;
  role: Role;
  goal: Goal;
}

export interface GameChoices {
  k1?: Choice;
  k2?: Choice;
  k3?: Choice;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'tutor';
  text: string;
  time: string;
}

export interface DecisionMeasurement {
  karar_suresi_sn: number;
  ipucu_acti: 0 | 1;
  tutor_mesaj: number;
  secim: Choice;
  sure_doldu: 0 | 1;
  aciklama_sn: number;
}

export interface OnboardingMeasurement {
  oyun_no: number;
  giris_sn: number;
  giris_degisiklik: number;
}
