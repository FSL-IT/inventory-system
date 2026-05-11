<?php
// src/core/response.php

function sendSuccess(array $data = [], string $message = 'OK'): void {
    header('Content-Type: application/json');
    echo json_encode([
        'success' => true,
        'message' => $message,
        'data'    => $data,
    ]);
    exit;
}

function sendError(string $message, int $code = 400): void {
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'message' => $message,
    ]);
    exit;
}

function sendPaginated(
    array $rows,
    int $total,
    int $page,
    int $perPage
): void {
    header('Content-Type: application/json');
    echo json_encode([
        'success'    => true,
        'data'       => $rows,
        'pagination' => [
            'total'    => $total,
            'page'     => $page,
            'per_page' => $perPage,
            'pages'    => (int) ceil($total / $perPage),
        ],
    ]);
    exit;
}
