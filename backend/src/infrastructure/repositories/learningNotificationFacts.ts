// Session and assessment dates are stored as UTC timestamps without a zone.
export const learningNotificationFacts = `
  WITH learner AS (
    SELECT p.user_id, p.timezone, p.streak_day, p.last_session_at,
      p.study_reminder_enabled, p.study_reminder_time,
      coalesce(prefs.notifications,'{}') AS preferences,
      now() AT TIME ZONE p.timezone AS local_now
    FROM learner_profiles p
    LEFT JOIN user_ui_preferences prefs ON prefs.user_id=p.user_id
    WHERE p.user_id=$1
  ), clock AS (
    SELECT learner.*, local_now::date AS today,
      date_trunc('day', local_now) AT TIME ZONE timezone AS day_start,
      (date_trunc('week', local_now)::date - 7)::text AS previous_week
    FROM learner
  ), latest_assessments AS (
    SELECT id, resulting_level::text AS level, taken_at
    FROM assessment_result WHERE user_id=$1 AND taken_at <= now() AT TIME ZONE 'UTC'
    ORDER BY taken_at DESC,id DESC LIMIT 2
  ), assessments AS (
    SELECT *, lead(level,1,'A1') OVER recent AS prior, row_number() OVER recent AS position
    FROM latest_assessments
    WINDOW recent AS (ORDER BY taken_at DESC,id DESC)
  )
  SELECT today::text AS day, previous_week AS "previousWeek",
    coalesce((preferences->>'review')::boolean, $2)
      AND local_now::time >= time '08:00' AS "reviewEnabled",
    study_reminder_enabled AND to_char(local_now,'HH24:MI') >= study_reminder_time
      AND NOT EXISTS (SELECT FROM sessions s WHERE s.user_id=$1 AND s.status='completed'
        AND s.ended_at >= day_start AT TIME ZONE 'UTC' AND s.ended_at <= now() AT TIME ZONE 'UTC')
      AND NOT EXISTS (SELECT FROM challenges g WHERE g.user_id=$1 AND g.kind<>'assessment'
        AND g.result IS NOT NULL AND g.completed_at >= day_start AND g.completed_at <= now())
      AS "dailyDue",
    CASE WHEN (preferences->>'streak')::boolean AND local_now::time >= time '18:00'
      AND (last_session_at AT TIME ZONE 'UTC' AT TIME ZONE timezone)::date = today-1
      THEN streak_day ELSE 0 END AS "streakAtRisk",
    coalesce((preferences->>'achievements')::boolean,false) AS achievements,
    coalesce((preferences->>'weekly')::boolean,false) AND NOT EXISTS (
      SELECT FROM user_notifications n WHERE n.user_id=$1 AND n.type='weekly' AND n.dedupe_key=previous_week
    ) AS weekly,
    coalesce((preferences->>'progress')::boolean,false) AS "progressEnabled",
    (SELECT jsonb_build_object('id',id,'level',level) FROM assessments
     WHERE position=1 AND (preferences->>'progress')::boolean
       AND taken_at >= (day_start AT TIME ZONE 'UTC') - interval '1 day'
       AND array_position(ARRAY['A1','A2','B1','B2','C1','C2'],level) >
           array_position(ARRAY['A1','A2','B1','B2','C1','C2'],prior)
     ORDER BY taken_at DESC,id DESC LIMIT 1) AS "levelProgress"
  FROM clock
`;
