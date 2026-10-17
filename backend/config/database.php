<?php
// MySQL (PDO) + MongoDB connections. Both are lazy and fail soft for Mongo.
final class Database
{
    private static ?PDO $pdo = null;
    private static $mongo = null;

    public static function mysql(): PDO
    {
        if (self::$pdo === null) {
            $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
                getenv('DB_HOST') ?: '127.0.0.1', getenv('DB_PORT') ?: '3306', getenv('DB_NAME') ?: 'football_live');
            self::$pdo = new PDO($dsn, getenv('DB_USER') ?: 'root', getenv('DB_PASS') ?: '', [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]);
        }
        return self::$pdo;
    }

    /** Returns a MongoDB\Database or null when the driver/server is unavailable. */
    public static function mongo()
    {
        if (self::$mongo === null) {
            self::$mongo = false;
            if (class_exists('MongoDB\\Client')) {
                try {
                    $client = new MongoDB\Client(getenv('MONGO_URI') ?: 'mongodb://127.0.0.1:27017');
                    self::$mongo = $client->selectDatabase(getenv('MONGO_DB') ?: 'football_live');
                } catch (Throwable $e) { self::$mongo = false; }
            }
        }
        return self::$mongo ?: null;
    }
}
