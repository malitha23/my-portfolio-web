<?php
// log.php – Accept POST, log IP + location + email
require __DIR__ . '/src/PHPMailer.php';
require __DIR__ . '/src/SMTP.php';
require __DIR__ . '/src/Exception.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // restrict in production
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
//     http_response_code(405);
//     echo json_encode(['error' => 'Method not allowed']);
//     exit;
// }

$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON']);
    exit;
}

// Required fields: type and message
if (empty($data['type']) || empty($data['message'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing type or message']);
    exit;
}

// ----- Get client IP -----
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';

// ----- Get location from IP using ip-api.com (free, no key) -----
$location = 'unknown';
if ($ip !== 'unknown' && $ip !== '127.0.0.1' && $ip !== '::1') {
    $geo = @file_get_contents("http://ip-api.com/json/{$ip}?fields=status,message,city,regionName,country");
    if ($geo) {
        $geoData = json_decode($geo, true);
        if ($geoData && $geoData['status'] === 'success') {
            $location = $geoData['city'] . ', ' . $geoData['regionName'] . ', ' . $geoData['country'];
        } else {
            $location = 'Unknown location';
        }
    }
}

// ----- Extract email (if provided) -----
$email = $data['email'] ?? '';

// ----- Build log entry -----
$now = new DateTime();
$logEntry = "
========================================
" . strtoupper($data['type']) . "
========================================
Date       : " . $now->format('Y-m-d H:i:s') . "
IP         : $ip
Location   : $location
Email      : " . ($email ?: 'N/A') . "
URL        : " . ($data['url'] ?? 'unknown') . "
User Agent : " . ($data['userAgent'] ?? 'unknown') . "
";

if ($data['type'] === 'visit') {
    $logEntry .= "Referrer   : " . ($data['referrer'] ?? 'Direct') . "
Screen     : " . ($data['screen'] ?? 'unknown') . "
Language   : " . ($data['language'] ?? 'unknown') . "
Timezone   : " . ($data['timezone'] ?? 'unknown') . "
";
} elseif ($data['type'] === 'review') {
    $logEntry .= "Project     : " . ($data['projectName'] ?? 'Unknown') . "
Review      : " . $data['message'] . "
";
} elseif ($data['type'] === 'contact') {
    $logEntry .= "Message     : " . $data['message'] . "
";
} else {
    $logEntry .= "Message     : " . $data['message'] . "
";
}
$logEntry .= "========================================

";

// ----- Append to log file -----
$logFile = __DIR__ . '/portfolio_logs.txt';
file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);

echo json_encode(['success' => true]);
?>