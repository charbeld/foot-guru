export type MatchStatus = 'scheduled' | 'live' | 'finished' | 'postponed'
export type MatchStage = 'group' | 'round_of_32' | 'round_of_16' | 'quarter_final' | 'semi_final' | 'third_place' | 'final'
export type PredictionOutcome = 'home' | 'draw' | 'away'

export interface Team {
  id: string
  name: string
  code: string
  flag_url: string | null
  elo_rating: number
  group_name: string | null
}

export interface Match {
  id: string
  home_team_id: string | null
  away_team_id: string | null
  stage: MatchStage
  group_name: string | null
  kickoff_at: string
  venue: string | null
  home_score: number | null
  away_score: number | null
  status: MatchStatus
  home_elo: number
  away_elo: number
  elo_gap: number
  stage_multiplier: number
  external_id: string | null
  placeholder_home: string | null
  placeholder_away: string | null
  wiki_url: string | null
  home_team?: Team
  away_team?: Team
}

export interface Prediction {
  id: string
  user_id: string
  match_id: string
  predicted_outcome: PredictionOutcome
  predicted_home: number | null
  predicted_away: number | null
  is_locked: boolean
  outcome_correct: boolean | null
  exact_score_correct: boolean | null
  elo_multiplier: number | null
  points_earned: number | null
  match?: Match
}

export interface Profile {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  total_points: number
}

export interface LeaderboardEntry extends Profile {
  rank: number
}

export interface League {
  id: string
  name: string
  invite_code: string
  created_by: string
}

export interface LeagueMember {
  league_id: string
  user_id: string
  joined_at: string
  profile?: Profile
}

export interface ScoringResult {
  outcomeCorrect: boolean
  exactScoreCorrect: boolean
  eloMultiplier: number
  stageMultiplier: number
  pointsEarned: number
  breakdown: string
}
