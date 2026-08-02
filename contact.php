<?php
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
    exit;
}

$name = trim($_POST['name'] ?? '');
$email = trim($_POST['email'] ?? '');
$subject = trim($_POST['subject'] ?? '');
$message = trim($_POST['message'] ?? '');

if ($name === '' || $email === '' || $subject === '' || $message === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Please fill in all fields.']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Please enter a valid email address.']);
    exit;
}

$to = 'tilenvennykungu@gmail.com';
$from = 'no-reply@yourdomain.com';
$replyTo = $email;
$fullSubject = 'Website Contact: ' . $subject;
$body = "Name: $name\nEmail: $email\n\nMessage:\n$message";
$headers = "From: $from\r\n";
$headers .= "Reply-To: $replyTo\r\n";
$headers .= "X-Mailer: PHP/" . phpversion();

$sent = mail($to, $fullSubject, $body, $headers);

if ($sent) {
    echo json_encode(['success' => true, 'message' => 'Your message has been sent successfully.']);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Message delivery failed. Please try again later or contact me directly at tilenvennykungu@gmail.com.']);
}
