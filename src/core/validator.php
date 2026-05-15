<?php
// src/core/validator.php

/**
 * Strip leading/trailing whitespace and remove null bytes.
 * Do NOT HTML-encode here — that belongs at output/render time.
 */
function sanitizeString(string $value): string
{
    return trim(str_replace("\0", '', $value));
}

function validateRequired(array $fields, array $data): array
{
    $errors = [];

    foreach ($fields as $field) {
        if (empty($data[$field])) {
            $errors[] = "Field '{$field}' is required.";
        }
    }

    return $errors;
}

function validateEnum(string $value, array $allowed): bool
{
    return in_array($value, $allowed, true);
}

function validateDate(string $date): bool
{
    $d = DateTime::createFromFormat('Y-m-d', $date);
    return $d && $d->format('Y-m-d') === $date;
}

function validatePassword(string $password): bool
{
    return strlen($password) >= 8;
}

function getPostString(string $key, string $default = ''): string
{
    return sanitizeString($_POST[$key] ?? $default);
}

function getQueryString(string $key, string $default = ''): string
{
    return sanitizeString($_GET[$key] ?? $default);
}

function getQueryInt(string $key, int $default = 0): int
{
    return (int) filter_input(INPUT_GET, $key, FILTER_VALIDATE_INT) ?: $default;
}

function getClientIp(): string
{
    $raw = $_SERVER['HTTP_X_FORWARDED_FOR']
        ?? $_SERVER['REMOTE_ADDR']
        ?? '0.0.0.0';

    return sanitizeString(explode(',', $raw)[0]);
}