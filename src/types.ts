export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  content: string;
  image: string;
  category: 'pro-league' | 'league-1' | 'league-2' | 'hazfi-cup' | 'legionnaires' | 'transfers' | 'futsal';
  tags: string[];
  viewCount: number;
  createdAt: string;
}

export interface MatchItem {
  id: string;
  teamHome: string;
  teamAway: string;
  teamHomeLogo: string;
  teamAwayLogo: string;
  scoreHome: number;
  scoreAway: number;
  status: 'not-started' | 'live' | 'finished' | 'archived';
  minutes?: string;
  league: 'pro-league' | 'league-1' | 'league-2' | 'hazfi-cup' | 'futsal' | string;
  date: string;
  time: string;
  venue: string;
  isPopular?: boolean;
  playerRatings?: Record<string, number>;
  mvpId?: string;
  
  // Custom multi-stage sports fields
  sport?: 'football' | 'futsal';
  stage?: 'Feature_Games' | 'Now_Games' | 'Finished_Games';
  season?: string;
  week?: string;
  referee?: string;
  odds?: string;
  previewDesc?: string;
  mediaInfo?: string;
  probableLineups?: { home: string[]; away: string[] };
  events?: any[];
  stats?: any;
  teamStats?: any;
  scorersList?: any[];
  winner?: string;
}

export interface StandingRow {
  rank: number;
  team: string;
  teamName?: string; // Support direct teamName as fallback inside controller
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface TransferItem {
  id: string;
  playerName: string;
  playerImage?: string;
  player_image?: string;
  fromTeam: string;
  toTeam: string;
  position: string;
  type: 'دائمی' | 'قرضی' | 'آزاد';
  date: string;
  fee: string;
  image?: string;
  details?: string;
  description?: string;
  viewCount?: number;
  createdAt?: string;
  created_at?: string;
  tags?: string[];
}

export interface LegionnaireItem {
  id: string;
  name: string;
  team: string;
  league: string;
  performance: string;
  rating: number;
  image: string;
  viewCount?: number;
  tags?: string[];
  
  // Extended fields loaded from DB
  teamLogo?: string;
  logo?: string;
  description?: string;
  summary?: string;
  nationality?: string;
  position?: string;
}

export interface ImageItem {
  id: string;
  url: string;
  caption: string;
  description?: string;
  tags: string[];
  width?: number;
  height?: number;
  fileSize?: number;
  altText?: string;
  photographer?: string;
  sourceUrl?: string;
  isFeatured?: boolean;
  viewCount?: number;
}

export interface StatsData {
  scorers: { rank: number; name: string; team: string; goals: number; penalties: number }[];
  assists: { rank: number; name: string; team: string; assists: number }[];
  cleansheets: { rank: number; name: string; team: string; cleanSheets: number }[];
  ratings?: { rank: number; name: string; team: string; rating: number }[];
}

export interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  isRead?: boolean;
  createdAt: string;
}

export interface TeamItem {
  id: string;
  name: string;
  logo: string;
  founded?: string;
  recentForm?: string[];
  coverImage?: string;
  stadium?: string;
  stadiumCapacity?: string;
  coach?: string;
  established?: string;
  city?: string;
  titles?: string[];
  sport?: string;
  stats?: {
    played?: number;
    won?: number;
    drawn?: number;
    lost?: number;
    points?: number;
  };
  recentMatches?: { date: string; opponent: string; score: string; isHome: boolean }[];
  upcomingMatches?: { date: string; opponent: string; time: string; venue: string }[];
  isEliminated?: boolean;
  divisionKey?: string;
}

export interface PlayerItem {
  id: string;
  name: string;
  number: string | number;
  shirt_number?: string | number;
  position: string;
  age: number | string;
  nationality: string;
  foot?: string;
  height?: string;
  teamId: string;
  teamName: string;
  image: string;
  seasonStats: {
    matches: number;
    goals: number;
    assists: number;
    cleanSheets?: number;
  };
  statsByTeam?: {
    teamId: string;
    teamName: string;
    matches: number;
    goals: number;
    assists: number;
    cleanSheets?: number;
  }[];
  matchesPlayed?: number;
  goals?: number;
  assists?: number;
  yellowCards?: number;
  redCards?: number;
  achievements?: string[];
  history?: { season: string; club: string; apps: number; goals: number }[];
  careerHistory?: {
    season: string;
    club: string;
    apps: number;
    goals: number;
    assists?: number;
    cleanSheets?: number;
    yellowCards?: number;
    redCards?: number;
    averageRating?: number;
  }[];
  averageRating?: number;
  ratingsHistory?: { matchId: string; matchOpponent: string; rating: number; date: string; isMvp?: boolean }[];
}

export interface SelectedCombinationPlayer {
  id: string;
  name: string;
  teamName: string;
  image: string;
  rating: number;
}

export interface SelectedCombination {
  id: string;
  leagueKey: string; // "pro-league" | "league-1" | "league-2"
  week: number;
  players: {
    gk?: SelectedCombinationPlayer | null;
    cb1?: SelectedCombinationPlayer | null;
    cb2?: SelectedCombinationPlayer | null;
    cb3?: SelectedCombinationPlayer | null;
    lm?: SelectedCombinationPlayer | null;
    cm1?: SelectedCombinationPlayer | null;
    cm2?: SelectedCombinationPlayer | null;
    cm3?: SelectedCombinationPlayer | null;
    rm?: SelectedCombinationPlayer | null;
    st1?: SelectedCombinationPlayer | null;
    st2?: SelectedCombinationPlayer | null;
    [key: string]: SelectedCombinationPlayer | null | undefined;
  };
}

export interface TeamTransferPlayer {
  id: string;
  playerName: string;
  playerImage?: string;
  fromTeam: string;
  toTeam: string;
  status: 'قطعی' | 'احتمالی' | 'قرضی';
}

export interface CoachItem {
  id: string;
  name: string;
  image: string;
  teamId: string;
  teamName: string;
  nationality: string;
  age: number | string;
  biography?: string;
  seasonStats: {
    matches: number;
    wins: number;
    draws: number;
    losses: number;
    winRate: number;
    goalsFor: number;
    goalsAgainst: number;
  };
  baseMatches?: number;
  baseWins?: number;
  baseDraws?: number;
  baseLosses?: number;
  titles?: string[];
  coachingStyle?: string;
  teamHistory?: {
    teamId: string;
    teamName: string;
    startYear: string;
    endYear: string;
    role: string;
  }[];
  licenseLevel?: string;
  experienceYears?: number;
  recentForm?: string[];
  careerHistory?: {
    season: string;
    club: string;
    apps: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
    winRate: number;
  }[];
}

export interface TeamTransferItem {
  id: string;
  teamName: string;
  teamLogo?: string;
  incomings: TeamTransferPlayer[];
  outgoings: TeamTransferPlayer[];
  probables: TeamTransferPlayer[];
}

export interface OverlayAdConfig {
  enabled: boolean;
  title: string;
  description: string;
  link: string;
  btnText: string;
  imageUrl?: string;
  position?: string;
  delay?: number;
  showAfterScroll?: boolean;
  scrollThreshold?: number;
  linkUrl?: string;
}

export interface AdSlot {
  id: string;
  name: string;
  type: 'text' | 'image' | 'mixed';
  text?: string;
  link?: string;
  imageUrl?: string;
  imageLink?: string;
  priority?: number;
  startDate?: string;
  endDate?: string;
  active?: boolean;
}

export interface AdConfig {
  adTitle: string;
  adPromo: string;
  adDesc: string;
  adLink: string;
  adBtnText: string;
  customBannerUrl: string;
  adSlots: AdSlot[];
  bannerLabel: string;
  bannerLabelVisible: boolean;
  bannerTagText: string;
  bannerVisible: boolean;
  popupAd: OverlayAdConfig;
  floatingAd: OverlayAdConfig;
  bottomBarAd: OverlayAdConfig;
  slideInAd: OverlayAdConfig;
}

export interface LiveGoal {
  id: string;
  scoringTeam: string;
  scorerName: string;
  minute: string;
  teamHome: string;
  scoreHome: number;
  scoreAway: number;
  teamAway: string;
}

export interface ArchiveItem {
  id: string;
  season: string;
  data: any;
  created_at?: string;
}

