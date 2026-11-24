// Calendar buckets use the learner's timezone. Existing session timestamps are stored in UTC.
const learningActivityCtes = `
  WITH calendar AS (
    SELECT timezone, daily_study_minutes, daily_new_words, (now() AT TIME ZONE timezone)::date AS today,
      date_trunc('week', now() AT TIME ZONE timezone)::date AS week_start,
      date_trunc('month', now() AT TIME ZONE timezone)::date AS month_start
    FROM learner_profiles WHERE user_id=$1
  ), session_history AS (
    SELECT s.id, (s.ended_at AT TIME ZONE 'UTC' AT TIME ZONE p.timezone)::date AS day,
      (s.started_at AT TIME ZONE 'UTC' AT TIME ZONE p.timezone)::time AS start_time,
      greatest(0, extract(epoch FROM s.ended_at-s.started_at)) AS seconds
    FROM sessions s CROSS JOIN calendar p
    WHERE s.user_id=$1 AND s.status='completed' AND s.ended_at<=now() AT TIME ZONE 'UTC'
  ), reviewed AS (
    SELECT s.id, s.day, c.word_id, t.correct
    FROM session_history s JOIN session_tasks t ON t.session_id=s.id AND t.completed
    JOIN cards c ON c.id=t.card_id AND c.user_id=$1 WHERE t.correct IS NOT NULL
  ), session_scores AS (
    SELECT id, count(*) FILTER (WHERE correct) AS hits, count(*) AS attempts
    FROM reviewed GROUP BY id
  ), first_words AS (
    SELECT word_id, min(day) AS day FROM reviewed WHERE correct GROUP BY word_id
  ), game_results AS (
    SELECT (g.completed_at AT TIME ZONE p.timezone)::date AS day,
      greatest(0, extract(epoch FROM g.completed_at-g.created_at)) AS seconds,
      coalesce((g.result->>'score')::integer, 0) AS xp,
      (g.result->>'correctCount')::integer AS hits,
      (g.result->>'totalQuestion')::integer AS attempts,
      CASE
        WHEN g.kind IN ('meaning_match','word_rush','mistake_words') THEN 'vocabulary'
        WHEN g.kind='build_sentence' THEN 'grammar'
        WHEN g.kind IN ('word_dictation','sentence_dictation') THEN 'listening'
        WHEN g.kind='finish_sentence' THEN 'reading'
        WHEN g.kind='type_word' THEN 'writing'
      END AS skill
    FROM challenges g CROSS JOIN calendar p
    WHERE g.user_id=$1 AND g.kind<>'assessment' AND g.completed_at<=now() AND g.result IS NOT NULL
  ), social_rewards AS (
    SELECT request_id AS id, awarded_at, points
    FROM friendship_rewards WHERE user_id=$1 AND awarded_at<=now()
    UNION ALL
    SELECT id, rewarded_at, reward_xp
    FROM referrals WHERE referrer_id=$1 AND rewarded_at<=now()
  ), events AS (
    SELECT s.day, s.seconds, coalesce(r.hits, 0)*10 AS xp, r.hits, r.attempts, 'vocabulary'::text AS skill,
      true AS session, true AS learning
    FROM session_history s LEFT JOIN session_scores r ON s.id=r.id
    UNION ALL
    SELECT day, seconds, xp, hits, attempts, skill, false, true FROM game_results
    UNION ALL
    SELECT (f.awarded_at AT TIME ZONE p.timezone)::date, 0, f.points, NULL, NULL, NULL, false, false
    FROM social_rewards f CROSS JOIN calendar p WHERE f.points>0
  )`;

export const learningAnalyticsQuery = `${learningActivityCtes}, totals AS (
    SELECT coalesce(sum(xp),0)::float8 AS xp, floor(coalesce(sum(seconds),0))::float8 AS seconds,
      round(100.0 * sum(hits) FILTER (WHERE skill IS NOT NULL)
        / nullif(sum(attempts) FILTER (WHERE skill IS NOT NULL),0))::integer AS accuracy
    FROM events
  ), daily AS (
    SELECT day, sum(seconds) AS seconds, sum(xp) AS xp,
      sum(hits) FILTER (WHERE skill IS NOT NULL) AS hits,
      sum(attempts) FILTER (WHERE skill IS NOT NULL) AS attempts
    FROM events GROUP BY day
  ), weekly_words AS (
    SELECT date_trunc('week', day::timestamp)::date AS week, count(*)::integer AS words
    FROM first_words GROUP BY 1
  ), weekly AS (
    SELECT w.start::date AS date, coalesce(sum(d.xp),0)::float8 AS xp,
      round(100.0 * sum(d.hits) / nullif(sum(d.attempts),0))::integer AS accuracy,
      coalesce(n.words,0) AS "newWords"
    FROM calendar p CROSS JOIN LATERAL generate_series(p.week_start-77, p.week_start, interval '7 days') AS w(start)
    LEFT JOIN daily d ON d.day>=w.start AND d.day<w.start+interval '7 days'
    LEFT JOIN weekly_words n ON n.week=w.start::date
    GROUP BY w.start,n.words
  ), heatmap AS (
    SELECT x.day::date AS date, floor(coalesce(d.seconds,0))::float8 AS "studySeconds"
    FROM calendar p CROSS JOIN LATERAL generate_series(p.week_start-77, p.week_start+6, interval '1 day') AS x(day)
    LEFT JOIN daily d ON d.day=x.day::date
  ), monthly AS (
    SELECT m.start::date AS date, floor(coalesce(sum(d.seconds),0))::float8 AS "studySeconds"
    FROM calendar p CROSS JOIN LATERAL generate_series(p.month_start-interval '5 months', p.month_start, interval '1 month') AS m(start)
    LEFT JOIN daily d ON d.day>=m.start AND d.day<m.start+interval '1 month'
    GROUP BY m.start
  ), skills AS (
    SELECT skill, round(100.0 * sum(hits) / sum(attempts))::integer AS accuracy
    FROM events WHERE skill IS NOT NULL AND attempts>0 GROUP BY skill
  )
  SELECT p.today::text AS today, t.xp AS "totalXp", t.accuracy, t.seconds AS "studySeconds",
    (SELECT count(*)::integer FROM cards WHERE user_id=$1 AND paused_at IS NULL) AS "activeWords",
    (SELECT jsonb_agg(to_jsonb(w) ORDER BY date) FROM weekly w) AS weeks,
    (SELECT jsonb_agg(to_jsonb(h) ORDER BY date) FROM heatmap h) AS days,
    (SELECT jsonb_agg(to_jsonb(m) ORDER BY date) FROM monthly m) AS months,
    (SELECT coalesce(jsonb_object_agg(skill,accuracy),'{}') FROM skills) AS skills
  FROM calendar p CROSS JOIN totals t
`;

export const completedWeekNotificationQuery = `${learningActivityCtes}
  SELECT
    (SELECT count(*)::integer FROM events
     WHERE learning AND day>=p.week_start-7 AND day<p.week_start) AS count,
    (SELECT floor(coalesce(sum(seconds),0)/60)::integer FROM events
     WHERE day>=p.week_start-7 AND day<p.week_start) AS minutes,
    (SELECT count(*)::integer FROM first_words
     WHERE day>=p.week_start-7 AND day<p.week_start) AS words
  FROM calendar p
`;

export const xpProgressNotificationQuery = `${learningActivityCtes}
  SELECT
    coalesce(sum(xp) FILTER (WHERE day < p.today-1),0)::float8 AS previous,
    coalesce(sum(xp),0)::float8 AS current
  FROM calendar p CROSS JOIN events
`;

export const learningCalendarQuery = `${learningActivityCtes}, selected_month AS (
    SELECT today, daily_study_minutes, daily_new_words,
      coalesce(($2::text || '-01')::date, month_start) AS start
    FROM calendar
  ), active_days AS (
    SELECT day, floor(sum(seconds))::float8 AS seconds, sum(xp)::float8 AS xp,
      count(*) FILTER (WHERE session)::integer AS sessions, bool_or(learning) AS active
    FROM events, selected_month WHERE day>=start AND day<start+interval '1 month'
    GROUP BY day
  ), new_words AS (
    SELECT day, count(*)::integer AS count
    FROM first_words, selected_month WHERE day>=start AND day<start+interval '1 month'
    GROUP BY day
  )
  SELECT m.today::text AS today, m.start::text AS "monthStart",
    m.daily_study_minutes AS "dailyStudyMinutes", m.daily_new_words AS "dailyNewWords",
    (
      SELECT jsonb_agg(jsonb_build_object(
        'date', d.day::date::text, 'studySeconds', coalesce(a.seconds, 0), 'xp', coalesce(a.xp, 0),
        'sessions', coalesce(a.sessions, 0), 'newWords', coalesce(w.count, 0), 'active', coalesce(a.active, false)
      ) ORDER BY d.day)
      FROM generate_series(m.start, m.start+interval '1 month'-interval '1 day', interval '1 day') AS d(day)
      LEFT JOIN active_days a ON a.day=d.day::date
      LEFT JOIN new_words w ON w.day=d.day::date
    ) AS days
  FROM selected_month m
`;

export const learningAchievementsQuery = `${learningActivityCtes}, streak_days AS (
    SELECT day, day - (row_number() OVER (ORDER BY day))::integer AS streak_group
    FROM (SELECT DISTINCT day FROM session_history) s
  ), streak_progress AS (
    SELECT day, row_number() OVER (PARTITION BY streak_group ORDER BY day) AS progress
    FROM streak_days
  ), word_progress AS (
    SELECT day, row_number() OVER (ORDER BY day,word_id) AS progress FROM first_words
  ), qualifying_sessions AS (
    SELECT s.day, s.id, rule.id AS achievement
    FROM session_history s LEFT JOIN session_scores score ON score.id=s.id
    CROSS JOIN LATERAL (VALUES
      ('first-step', true),
      ('early-bird', s.start_time<time '07:00'),
      ('night-owl', s.start_time>=time '23:00'),
      ('accuracy-50', score.hits*10>score.attempts*9),
      ('perfect-session', score.hits=score.attempts)
    ) AS rule(id, accepted)
    WHERE rule.accepted
  ), daily_time AS (
    SELECT day, sum(seconds) AS seconds FROM events GROUP BY day
  ), milestones AS (
    SELECT achievement AS id, day, row_number() OVER (PARTITION BY achievement ORDER BY day,id) AS progress
    FROM qualifying_sessions
    UNION ALL
    SELECT rule.id, day, progress FROM streak_progress CROSS JOIN (VALUES ('streak-30'), ('streak-100')) AS rule(id)
    UNION ALL
    SELECT rule.id, day, progress FROM word_progress CROSS JOIN (VALUES ('words-1000'), ('words-2000')) AS rule(id)
    UNION ALL
    SELECT 'level-b2', (a.taken_at AT TIME ZONE 'UTC' AT TIME ZONE p.timezone)::date,
      array_position(ARRAY['A1','A2','B1','B2','C1','C2'], a.resulting_level::text)
    FROM assessment_result a CROSS JOIN calendar p
    WHERE a.user_id=$1 AND a.taken_at<=now() AT TIME ZONE 'UTC'
    UNION ALL
    SELECT 'marathon', day, floor(sum(seconds) OVER (PARTITION BY date_trunc('month', day::timestamp) ORDER BY day))
    FROM daily_time
    UNION ALL
    SELECT 'social', (f.awarded_at AT TIME ZONE p.timezone)::date,
      row_number() OVER (ORDER BY f.awarded_at,f.id)
    FROM social_rewards f CROSS JOIN calendar p
  )
  SELECT rule.id, rule.target, rule."rewardXp",
    coalesce(max(m.progress),0)::float8 AS progress,
    min(m.day) FILTER (WHERE m.progress>=rule.target)::text AS "earnedOn"
  FROM jsonb_to_recordset($2::jsonb) AS rule(id text,target integer,"rewardXp" integer)
  LEFT JOIN milestones m ON rule.id=m.id GROUP BY rule.id,rule.target,rule."rewardXp"
`;
