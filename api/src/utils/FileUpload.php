<?php
/**
 * Utility para salvar arquivos base64 em disco
 *
 * Duas pastas:
 *   - arquivosupload/ → anexos enviados pelos usuários (referências)
 *   - upload/         → PDFs de entrega enviados pelo admin
 */
class FileUpload {

    // ── Diretório para anexos dos usuários ──────────────────────────────
    private static $uploadDir;

    public static function getUploadDir() {
        if (!self::$uploadDir) {
            self::$uploadDir = realpath(__DIR__ . '/../../') . '/arquivosupload/';
        }
        if (!is_dir(self::$uploadDir)) {
            mkdir(self::$uploadDir, 0755, true);
        }
        return self::$uploadDir;
    }

    // ── Diretório para PDFs de entrega do admin ─────────────────────────
    private static $deliveryDir;

    public static function getDeliveryDir() {
        if (!self::$deliveryDir) {
            self::$deliveryDir = realpath(__DIR__ . '/../../') . '/upload/';
        }
        if (!is_dir(self::$deliveryDir)) {
            mkdir(self::$deliveryDir, 0755, true);
        }
        return self::$deliveryDir;
    }

    // ── Helpers genéricos ───────────────────────────────────────────────

    /**
     * Salva um arquivo base64 em disco
     * @param string $base64Data  dados base64 (pode incluir header data:...)
     * @param string $originalName nome original do arquivo
     * @param string $prefix      prefixo para o nome (ex: "ped_42_anexo1")
     * @param string $dir         diretório destino (caminho absoluto, com / no final)
     * @return string|null        nome do arquivo salvo ou null em caso de erro
     */
    public static function saveBase64ToDir($base64Data, $originalName, $prefix, $dir) {
        if (empty($base64Data)) return null;

        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        // Remover header data:xxx;base64,
        $data = $base64Data;
        if (strpos($data, ',') !== false) {
            $data = explode(',', $data, 2)[1];
        }

        $decoded = base64_decode($data, true);
        if ($decoded === false) return null;

        $ext = pathinfo($originalName, PATHINFO_EXTENSION);
        if (empty($ext)) $ext = 'pdf';
        $ext = strtolower($ext);

        $timestamp   = date('Ymd_His');
        $standardName = "{$prefix}_{$timestamp}.{$ext}";
        $filePath    = $dir . $standardName;

        $result = file_put_contents($filePath, $decoded);
        if ($result === false) return null;

        return $standardName;
    }

    /**
     * Salva anexo do usuário em arquivosupload/
     */
    public static function saveBase64File($base64Data, $originalName, $prefix) {
        return self::saveBase64ToDir($base64Data, $originalName, $prefix, self::getUploadDir());
    }

    /**
     * Salva PDF de entrega do admin em upload/
     */
    public static function saveDeliveryPdf($base64Data, $originalName, $prefix) {
        return self::saveBase64ToDir($base64Data, $originalName, $prefix, self::getDeliveryDir());
    }

    // ── Operações por tipo ──────────────────────────────────────────────

    /**
     * Deleta um arquivo do diretório de anexos (arquivosupload/)
     */
    public static function deleteFile($filename) {
        if (empty($filename)) return false;
        $path = self::getUploadDir() . basename($filename);
        if (file_exists($path)) {
            return unlink($path);
        }
        return false;
    }

    /**
     * Deleta um arquivo do diretório de entregas (upload/)
     */
    public static function deleteDeliveryFile($filename) {
        if (empty($filename)) return false;
        $path = self::getDeliveryDir() . basename($filename);
        if (file_exists($path)) {
            return unlink($path);
        }
        return false;
    }

    /**
     * Retorna o caminho completo de um anexo (arquivosupload/)
     */
    public static function getFilePath($filename) {
        if (empty($filename)) return null;
        $path = self::getUploadDir() . basename($filename);
        return file_exists($path) ? $path : null;
    }

    /**
     * Retorna o caminho completo de um PDF de entrega (upload/)
     */
    public static function getDeliveryFilePath($filename) {
        if (empty($filename)) return null;
        $path = self::getDeliveryDir() . basename($filename);
        return file_exists($path) ? $path : null;
    }

    // ── Servir arquivos ─────────────────────────────────────────────────

    private static function sendFile($path, $filename) {
        if (!$path) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Arquivo não encontrado']);
            return;
        }

        $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        $mimeTypes = [
            'pdf'  => 'application/pdf',
            'jpg'  => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'png'  => 'image/png',
            'gif'  => 'image/gif',
        ];
        $mime   = $mimeTypes[$ext] ?? 'application/octet-stream';

        header('Content-Type: ' . $mime);
        header('Content-Disposition: inline; filename="' . $filename . '"');
        header('Content-Length: ' . filesize($path));
        header('Cache-Control: public, max-age=86400');
        readfile($path);
        exit;
    }

    /**
     * Serve um anexo do usuário (arquivosupload/)
     */
    public static function serveFile($filename, $downloadName = null) {
        $path = self::getFilePath($filename);
        self::sendFile($path, $downloadName ?: $filename);
    }

    /**
     * Serve um PDF de entrega (upload/)
     */
    public static function serveDeliveryFile($filename, $downloadName = null) {
        $path = self::getDeliveryFilePath($filename);
        self::sendFile($path, $downloadName ?: $filename);
    }
}
