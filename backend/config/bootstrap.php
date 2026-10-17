<?php
declare(strict_types=1);
// Shared bootstrap: autoload, CORS, JSON helpers, rate limiting.
$vendor = __DIR__ . '/../vendor/autoload.php';
if (is_file($vendor)) require $vendor;
require_once __DIR__ . '/database.php';
require_once __DIR__ . '/../services/FotmobService.php';

$CONFIG = require __DIR__ . '/api_config.php';

header('Access-Control-Allow-Origin: ' . $CONFIG['allowed_origin']);
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') { http_response_code(204); exit; }

function json_out($data, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function rate_limit(array $cfg): void
{
    try {
        $pdo = Database::mysql();
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        $window = (int) floor(time() / $cfg['window_seconds']);
        $pdo->prepare('INSERT INTO rate_limits (ip, window_start, hits) VALUES (?, ?, 1)
                       ON DUPLICATE KEY UPDATE hits = hits + 1')->execute([$ip, $window]);
        $st = $pdo->prepare('SELECT hits FROM rate_limits WHERE ip = ? AND window_start = ?');
        $st->execute([$ip, $window]);
        if ((int) $st->fetchColumn() > $cfg['max_requests']) {
            header('Retry-After: ' . $cfg['window_seconds']);
            json_out(['error' => 'Too many requests'], 429);
        }
        if (random_int(1, 50) === 1) {
            $pdo->prepare('DELETE FROM rate_limits WHERE window_start < ?')->execute([$window - 5]);
        }
    } catch (PDOException $e) { /* DB down: do not block requests */ }
}

rate_limit($CONFIG['rate_limit']);
$service = new FotmobService($CONFIG);
