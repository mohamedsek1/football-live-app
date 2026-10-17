<?php
// GET /api/get_ratings.php?matchId=123 -> normalised content.lineup (starters, subs, coaches, ratings)
require __DIR__ . '/../config/bootstrap.php';
if (!ctype_digit((string) ($_GET['matchId'] ?? ''))) json_out(['error' => 'Invalid matchId'], 400);
try {
    $m = $service->match((int) $_GET['matchId']);
    json_out(['content' => ['lineup' => $m['lineup']]]);
} catch (Throwable $e) { json_out(['error' => $e->getMessage()], $e->getCode() === 502 ? 502 : 500); }
