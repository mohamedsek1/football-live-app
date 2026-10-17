<?php
// Central configuration. Override with environment variables in production.
return [
'fotmob_base' => getenv('FOTMOB_BASE') ?: 'https://www.fotmob.com/api/data',    // FotMob may require extra headers (e.g. x-mas). Provide them here if needed.
    'fotmob_headers'  => array_filter([
        'User-Agent: Mozilla/5.0 (compatible; FootballLiveApp/1.0)',
        'Accept: application/json',
        getenv('FOTMOB_X_MAS') ? 'x-mas: ' . getenv('FOTMOB_X_MAS') : null,
    ]),
    'allowed_origin'  => getenv('ALLOWED_ORIGIN') ?: 'http://localhost:5173',
    'ttl' => [
        'schedule_past'   => 3600,
        'schedule_today'  => 30,
        'live'            => 15,
        'match_finished'  => 3600,
        'match_live'      => 15,
    ],
    'rate_limit' => ['max_requests' => 60, 'window_seconds' => 60],
];
