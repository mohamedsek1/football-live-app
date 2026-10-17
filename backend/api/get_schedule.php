<?php
// GET /api/get_schedule.php?date=YYYYMMDD  (defaults to today)
require __DIR__ . '/../config/bootstrap.php';
$date = $_GET['date'] ?? date('Ymd');
if (!preg_match('/^\d{8}$/', $date)) json_out(['error' => 'Invalid date, expected YYYYMMDD'], 400);
try { json_out($service->schedule($date)); }
catch (Throwable $e) { json_out(['error' => $e->getMessage()], $e->getCode() === 502 ? 502 : 500); }
