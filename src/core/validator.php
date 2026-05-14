<?php

function sanitizeString(string $value): string {
    return htmlspecialchars(trim($value), ENT_QUOTES, 'UTF-8');
}

function validateRequired(array $fields, array $data): array {
    $errors = [];

    foreach ($fields as $field) {
        if (empty($data[$field])) {
            $errors[] = "Field '{$field}' is required.";
        }
    }

    return $errors;
}

function validateEnum(string $value, array $allowed): bool {
    return in_array($value, $allowed, true);
}

function validateDate(string $date): bool {
    $d = DateTime::createFromFormat('Y-m-d', $date);
    return $d && $d->format('Y-m-d') === $date;
}

function validatePassword(string $password): bool {
    return strlen($password) >= 12
        && preg_match('/[A-Z]/', $password)
        && preg_match('/[a-z]/', $password)
        && preg_match('/[0-9]/', $password)
        && preg_match('/[^A-Za-z0-9]/', $password);
}

function getJsonBody(): array {
    $body = json_decode(file_get_contents('php://input'), true);

    if (!is_array($body)) {
        return [];
    }

    return $body;
}

function getPostString(string $key, string $default = ''): string {
    return sanitizeString($_POST[$key] ?? $default);
}

function getQueryString(string $key, string $default = ''): string {
    return sanitizeString($_GET[$key] ?? $default);
}

function getQueryInt(string $key, int $default = 0): int {
    $value = filter_input(INPUT_GET, $key, FILTER_VALIDATE_INT);

    return $value === false || $value === null ? $default : (int) $value;
}

function validateUploadedFile(
    array $file,
    array $allowedExtensions,
    int $maxBytes
): void {
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        sendError('File upload failed.', 422);
    }

    if (($file['size'] ?? 0) <= 0 || $file['size'] > $maxBytes) {
        sendError('File size is invalid.', 422);
    }

    $extension = strtolower(pathinfo($file['name'] ?? '', PATHINFO_EXTENSION));

    if (!in_array($extension, $allowedExtensions, true)) {
        sendError('File type is not allowed.', 422);
    }

    if (!is_uploaded_file($file['tmp_name'])) {
        sendError('Invalid uploaded file.', 422);
    }
}

function getClientIp(): string {
    $ip = $_SERVER['HTTP_X_FORWARDED_FOR']
        ?? $_SERVER['REMOTE_ADDR']
        ?? '0.0.0.0';

    return sanitizeString(explode(',', $ip)[0]);
}
