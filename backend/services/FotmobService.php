<?php
declare(strict_types=1);

/**
 * Proxy wrapper around FotMob's unofficial API with MySQL caching,
 * MongoDB persistence of live payloads and lineup normalisation.
 */
final class FotmobService
{
    public function __construct(private array $cfg) {}

    // ---------- HTTP + cache ----------
    private function fetch(string $path, array $query): array
    {
        $url = $this->cfg['fotmob_base'] . $path . '?' . http_build_query($query);
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10, CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_ENCODING => '', CURLOPT_HTTPHEADER => $this->cfg['fotmob_headers'],
        ]);
        $body = curl_exec($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        $data = is_string($body) ? json_decode($body, true) : null;
        if ($code !== 200 || !is_array($data)) {
            throw new RuntimeException("Upstream error ($code) for $path", 502);
        }
        return $data;
    }

    private function cached(string $key, int $ttl, callable $loader): array
    {
        $pdo = Database::mysql();
        $st = $pdo->prepare('SELECT payload FROM api_cache WHERE cache_key = ? AND expires_at > ?');
        $st->execute([$key, time()]);
        if (($row = $st->fetchColumn()) !== false) return json_decode($row, true);

        try {
            $data = $loader();
        } catch (RuntimeException $e) {
            // Serve stale data if upstream fails.
            $st = $pdo->prepare('SELECT payload FROM api_cache WHERE cache_key = ?');
            $st->execute([$key]);
            if (($row = $st->fetchColumn()) !== false) return json_decode($row, true);
            throw $e;
        }
        $pdo->prepare('REPLACE INTO api_cache (cache_key, payload, expires_at) VALUES (?, ?, ?)')
            ->execute([$key, json_encode($data, JSON_UNESCAPED_UNICODE), time() + $ttl]);
        return $data;
    }

    // ---------- Schedule ----------
    /** @param string $date YYYYMMDD */
    public function schedule(string $date): array
    {
        $isToday = $date === date('Ymd');
        $ttl = $isToday ? $this->cfg['ttl']['schedule_today'] : $this->cfg['ttl']['schedule_past'];
        $raw = $this->cached("schedule:$date", $ttl, fn () => $this->fetch('/matches', ['date' => $date]));

        $leagues = [];
        foreach ($raw['leagues'] ?? [] as $l) {
            $leagues[] = [
                'id'      => $l['primaryId'] ?? $l['id'] ?? null,
                'name'    => $l['name'] ?? '',
                'country' => $l['ccode'] ?? '',
                'matches' => array_map([$this, 'normalizeMatch'], $l['matches'] ?? []),
            ];
        }
        $this->syncReference($leagues);
        usort($leagues, fn ($a, $b) => [$a['country'], $a['name']] <=> [$b['country'], $b['name']]);
        return ['date' => $date, 'leagues' => $leagues];
    }

    private function normalizeMatch(array $m): array
    {
        $s = $m['status'] ?? [];
        $started = !empty($s['started']);
        $finished = !empty($s['finished']);
        return [
            'id'       => $m['id'],
            'time'     => $m['status']['utcTime'] ?? $m['time'] ?? null,
            'home'     => ['id' => $m['home']['id'] ?? null, 'name' => $m['home']['name'] ?? '', 'score' => $m['home']['score'] ?? null],
            'away'     => ['id' => $m['away']['id'] ?? null, 'name' => $m['away']['name'] ?? '', 'score' => $m['away']['score'] ?? null],
            'status'   => [
                'started'   => $started,
                'finished'  => $finished,
                'cancelled' => !empty($s['cancelled']),
                'live'      => $started && !$finished && empty($s['cancelled']),
                'scoreStr'  => $s['scoreStr'] ?? null,
                'minute'    => $s['liveTime']['short'] ?? null,
                'reason'    => $s['reason']['short'] ?? null,
            ],
        ];
    }

    /** Keep MySQL league/team reference tables up to date. */
    private function syncReference(array $leagues): void
    {
        try {
            $pdo = Database::mysql();
            $lg = $pdo->prepare('REPLACE INTO leagues (id, name, country_code) VALUES (?, ?, ?)');
            $tm = $pdo->prepare('REPLACE INTO teams (id, name) VALUES (?, ?)');
            foreach ($leagues as $l) {
                if ($l['id']) $lg->execute([$l['id'], $l['name'], $l['country']]);
                foreach ($l['matches'] as $m) foreach (['home', 'away'] as $side) {
                    if ($m[$side]['id']) $tm->execute([$m[$side]['id'], $m[$side]['name']]);
                }
            }
        } catch (PDOException $e) { /* non-critical */ }
    }

    public function live(): array
    {
        $out = [];
        foreach ($this->schedule(date('Ymd'))['leagues'] as $l) {
            $m = array_values(array_filter($l['matches'], fn ($x) => $x['status']['live']));
            if ($m) $out[] = ['id' => $l['id'], 'name' => $l['name'], 'country' => $l['country'], 'matches' => $m];
        }
        return ['leagues' => $out];
    }

    // ---------- Match details ----------
    public function match(int $id): array
    {
        $probe = $this->cached("match:$id", $this->cfg['ttl']['match_live'],
            fn () => $this->fetch('/matchDetails', ['matchId' => $id]));
        $finished = !empty($probe['header']['status']['finished']);
        if ($finished) {
            // Finished matches change rarely: extend cache lifetime.
            Database::mysql()->prepare('UPDATE api_cache SET expires_at = ? WHERE cache_key = ?')
                ->execute([time() + $this->cfg['ttl']['match_finished'], "match:$id"]);
        }

        $header = $probe['header'] ?? [];
        $teams = $header['teams'] ?? [];
        $result = [
            'id'     => $id,
            'status' => [
                'started'  => !empty($header['status']['started']),
                'finished' => $finished,
                'live'     => !empty($header['status']['started']) && !$finished,
                'scoreStr' => $header['status']['scoreStr'] ?? null,
                'minute'   => $header['status']['liveTime']['short'] ?? null,
            ],
            'home'   => ['id' => $teams[0]['id'] ?? null, 'name' => $teams[0]['name'] ?? '', 'score' => $teams[0]['score'] ?? null],
            'away'   => ['id' => $teams[1]['id'] ?? null, 'name' => $teams[1]['name'] ?? '', 'score' => $teams[1]['score'] ?? null],
            'events' => $this->events($probe),
            'stats'  => $this->stats($probe),
            'lineup' => $this->lineup($probe),
        ];
        $this->storeMongo($result);
        return $result;
    }

    public function lineup(array $payload): ?array
    {
        $lu = $payload['content']['lineup'] ?? null;
        if (!$lu) return null;

        $player = function (array $p): array {
            $coords = $p['pitchCoordinates'] ?? null;
            if (!$coords && isset($p['verticalLayout'])) { // fallback: FotMob 0..1 layout
                $coords = ['x' => round(($p['verticalLayout']['x'] ?? 0.5) * 100, 1),
                           'y' => round(($p['verticalLayout']['y'] ?? 0.5) * 100, 1)];
            }
            $num = $p['rating']['num'] ?? $p['performance']['rating'] ?? null;
            return [
                'id'               => $p['id'] ?? null,
                'name'             => [
                    'firstName' => $p['name']['firstName'] ?? '',
                    'lastName'  => $p['name']['lastName'] ?? (is_string($p['name'] ?? null) ? $p['name'] : ''),
                ],
                'shirtNumber'      => (string) ($p['shirtNumber'] ?? ''),
                'position'         => $p['position'] ?? '',
                'positionId'       => $p['positionId'] ?? null,
                'rating'           => $num !== null ? ['num' => (string) $num, 'bgcolor' => $p['rating']['bgcolor'] ?? null] : null,
                'isCaptain'        => !empty($p['isCaptain']),
                'isGoalkeeper'     => !empty($p['isGoalkeeper']),
                'stats'            => $p['stats'] ?? [],
                'pitchCoordinates' => $coords,
                'timeSubbedOn'     => $p['timeSubbedOn'] ?? null,
                'timeSubbedOff'    => $p['timeSubbedOff'] ?? null,
            ];
        };
        $mapTeams = fn (array $teams) => array_map(fn ($t) => array_map($player, $t), $teams);

        return [
            'lineups'  => array_map(fn ($t) => ['teamId' => $t['teamId'] ?? null, 'teamName' => $t['teamName'] ?? ''], $lu['lineups'] ?? []),
            'starters' => $mapTeams($lu['starters'] ?? []),
            'subs'     => $mapTeams($lu['subs'] ?? []),
            'coaches'  => $lu['coaches'] ?? [],
        ];
    }

    private function events(array $p): array
    {
        $out = [];
        foreach ($p['content']['matchFacts']['events']['events'] ?? [] as $e) {
            $out[] = [
                'type'   => $e['type'] ?? '',
                'time'   => $e['time'] ?? null,
                'isHome' => !empty($e['isHome']),
                'player' => $e['nameStr'] ?? $e['player']['name'] ?? '',
                'card'   => $e['card'] ?? null,
                'assist' => $e['assistStr'] ?? null,
                'swap'   => $e['swap'] ?? null,
            ];
        }
        return $out;
    }

    private function stats(array $p): array
    {
        $out = [];
        foreach ($p['content']['stats']['Periods']['All']['stats'] ?? [] as $group) {
            foreach ($group['stats'] ?? [] as $s) {
                if (($s['type'] ?? '') === 'title' || !isset($s['stats'][0])) continue;
                $out[] = ['title' => $s['title'] ?? '', 'home' => $s['stats'][0], 'away' => $s['stats'][1] ?? null];
            }
        }
        return $out;
    }

    /** Persist live payload, formations and player metrics in MongoDB (best effort). */
    private function storeMongo(array $r): void
    {
        $db = Database::mongo();
        if (!$db) return;
        try {
            $now = new MongoDB\BSON\UTCDateTime();
            $opts = ['upsert' => true];
            $db->selectCollection('live_matches')->replaceOne(['matchId' => $r['id']],
                ['matchId' => $r['id'], 'status' => $r['status'], 'home' => $r['home'], 'away' => $r['away'],
                 'events' => $r['events'], 'stats' => $r['stats'], 'updatedAt' => $now], $opts);
            if ($r['lineup']) {
                $db->selectCollection('lineups')->replaceOne(['matchId' => $r['id']],
                    ['matchId' => $r['id'], 'lineup' => $r['lineup'], 'updatedAt' => $now], $opts);
                $perf = $db->selectCollection('player_performance');
                foreach ($r['lineup']['starters'] as $team) foreach ($team as $pl) {
                    $perf->replaceOne(['matchId' => $r['id'], 'playerId' => $pl['id']],
                        ['matchId' => $r['id'], 'playerId' => $pl['id'], 'name' => $pl['name'],
                         'rating' => $pl['rating'], 'stats' => $pl['stats'], 'updatedAt' => $now], $opts);
                }
            }
        } catch (Throwable $e) { /* non-critical */ }
    }
}
