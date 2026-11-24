// Period boundaries are shared by all participants so a given period ranks equally for every viewer.
export const leaderboardQuery = `
  WITH bounds AS (
    SELECT CASE $2::text
      WHEN 'today' THEN date_trunc('day', now() AT TIME ZONE 'Asia/Tashkent') AT TIME ZONE 'Asia/Tashkent'
      WHEN 'week' THEN date_trunc('week', now() AT TIME ZONE 'Asia/Tashkent') AT TIME ZONE 'Asia/Tashkent'
      WHEN 'month' THEN date_trunc('month', now() AT TIME ZONE 'Asia/Tashkent') AT TIME ZONE 'Asia/Tashkent'
    END AS starts_at
  ), eligible AS (
    SELECT u.id, u.full_name AS "fullName", u.avatar_url AS "avatarUrl",
      (u.email_verified_at IS NOT NULL AND coalesce(u.location,'')<>'' AND u.gender IS NOT NULL
        AND u.gender<>'undisclosed' AND coalesce(u.phone_number,'')<>'') AS "hasProfileBadge",
      (u.profile_public AND u.profile_sharing) AS "canViewProfile",
      (u.profile_public AND u.profile_sharing AND u.public_statistics) AS listed,
      CASE WHEN (p.last_session_at AT TIME ZONE 'UTC' AT TIME ZONE p.timezone)::date >=
        (now() AT TIME ZONE p.timezone)::date-1 THEN p.streak_day ELSE 0 END AS streak
    FROM users u JOIN learner_profiles p ON p.user_id=u.id
    WHERE u.id=$1 OR (u.profile_public AND u.profile_sharing AND u.public_statistics)
  ), scores AS (
    SELECT s.user_id, count(*) * 10 AS points
    FROM eligible e JOIN sessions s ON s.user_id=e.id
    JOIN session_tasks t ON t.session_id=s.id AND t.completed AND t.correct
    JOIN cards c ON c.id=t.card_id AND c.user_id=s.user_id
    CROSS JOIN bounds b
    WHERE s.status='completed' AND s.ended_at<=now() AT TIME ZONE 'UTC'
      AND (b.starts_at IS NULL OR s.ended_at >= b.starts_at AT TIME ZONE 'UTC')
    GROUP BY s.user_id
    UNION ALL
    SELECT g.user_id, sum((g.result->>'score')::integer) AS points
    FROM eligible e JOIN challenges g ON g.user_id=e.id CROSS JOIN bounds b
    WHERE g.kind<>'assessment' AND g.completed_at<=now() AND g.result IS NOT NULL
      AND (b.starts_at IS NULL OR g.completed_at>=b.starts_at)
    GROUP BY g.user_id
    UNION ALL
    SELECT f.user_id, sum(f.points) AS points
    FROM eligible e JOIN friendship_rewards f ON f.user_id=e.id CROSS JOIN bounds b
    WHERE f.points>0 AND f.awarded_at<=now()
      AND (b.starts_at IS NULL OR f.awarded_at>=b.starts_at)
    GROUP BY f.user_id
    UNION ALL
    SELECT f.referrer_id AS user_id, sum(f.reward_xp) AS points
    FROM eligible e JOIN referrals f ON f.referrer_id=e.id CROSS JOIN bounds b
    WHERE f.rewarded_at<=now() AND (b.starts_at IS NULL OR f.rewarded_at>=b.starts_at)
    GROUP BY f.referrer_id
  ), totals AS (
    SELECT user_id, sum(points)::float8 AS xp FROM scores GROUP BY user_id
  ), ranked AS (
    SELECT e.*, t.xp, row_number() OVER (ORDER BY t.xp DESC,e."fullName" COLLATE "C",e.id)::integer AS rank
    FROM eligible e JOIN totals t ON t.user_id=e.id WHERE e.listed AND t.xp>0
  )
  SELECT
    (SELECT coalesce(jsonb_agg(to_jsonb(r)-'listed' ORDER BY r.rank),'[]') FROM (SELECT * FROM ranked ORDER BY rank LIMIT 50) r) AS entries,
    (SELECT (to_jsonb(e)-'listed') || jsonb_build_object('xp',coalesce(t.xp,0),'rank',r.rank)
      FROM eligible e LEFT JOIN totals t ON t.user_id=e.id LEFT JOIN ranked r ON r.id=e.id WHERE e.id=$1) AS own,
    (SELECT count(*)::integer FROM ranked) AS participants
`;
