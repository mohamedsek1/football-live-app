<?php
// GET /api/get_scores.php?live=1        -> live matches grouped by league
// GET /api/get_scores.php?matchId=123   -> full match (status, events, stats, lineup)
require __DIR__ . '/../config/bootstrap.php';
try {
    if (isset($_GET['matchId'])) {
        if (!ctype_digit((string) $_GET['matchId'])) json_out(['error' => 'Invalid matchId'], 400);
        json_out($service->match((int) $_GET['matchId']));
    }
    json_out($service->live());
} catch (Throwable $e) { json_out(['error' => $e->getMessage()], $e->getCode() === 502 ? 502 : 500); }
