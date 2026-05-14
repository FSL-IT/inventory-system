<?php

function sendJson(array $payload, int $code = 200): void {
    header('Content-Type: application/json');
    http_response_code($code);
    echo json_encode($payload, JSON_THROW_ON_ERROR);
    exit;
}

function sendSuccess(array $data = [], string $message = 'OK'): void {
    sendJson([
        'success' => true,
        'message' => $message,
        'data'    => $data,
    ]);
}

function sendError(string $message, int $code = 400): void {
    sendJson([
        'success' => false,
        'message' => $message,
    ], $code);
}

function sendPaginated(
    array $rows,
    int $total,
    int $page,
    int $perPage
): void {
    sendJson([
        'success'    => true,
        'data'       => $rows,
        'pagination' => [
            'total'    => $total,
            'page'     => $page,
            'per_page' => $perPage,
            'pages'    => (int) ceil($total / $perPage),
        ],
    ]);
}
