/**
 * Генерация самоподписанного SSL сертификата
 * Для локальной разработки Telegram Mini App
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const sslDir = path.join(__dirname, 'ssl');

// Создаём директорию для сертификатов
if (!fs.existsSync(sslDir)) {
    fs.mkdirSync(sslDir, { recursive: true });
}

console.log('🔐 Генерация SSL сертификата...\n');

try {
    // Проверяем наличие openssl
    try {
        execSync('openssl version', { stdio: 'ignore' });
    } catch (e) {
        console.log('❌ OpenSSL не найден. Установите OpenSSL для генерации сертификата.');
        console.log('');
        console.log('📥 Скачать OpenSSL: https://slproweb.com/products/Win32OpenSSL.html');
        console.log('');
        console.log('Или используйте альтернативный метод:');
        console.log('npm install -g mkcert');
        console.log('mkcert create-ca');
        console.log('mkcert create-cert --domains localhost');
        process.exit(1);
    }

    // Генерация приватного ключа
    console.log('📝 Генерация приватного ключа...');
    execSync(`openssl genrsa -out "${path.join(sslDir, 'key.pem')}" 2048`, { stdio: 'inherit' });

    // Генерация сертификата
    console.log('📜 Генерация сертификата...');
    const certPath = path.join(sslDir, 'cert.pem');
    const keyPath = path.join(sslDir, 'key.pem');
    
    execSync(`openssl req -new -x509 -key "${keyPath}" -out "${certPath}" -days 365 -subj "/C=RU/ST=Moscow/L=Moscow/O=AI Racing/OU=Dev/CN=localhost"`, { stdio: 'inherit' });

    console.log('\n✅ SSL сертификат успешно создан!');
    console.log(`📁 Ключ: ${keyPath}`);
    console.log(`📁 Сертификат: ${certPath}`);
    console.log('');
    console.log('⚠️ Важно: Это самоподписанный сертификат.');
    console.log('Для Telegram Mini App нужен доверенный сертификат.');
    console.log('');
    console.log('🔧 Рекомендуется использовать localtunnel:');
    console.log('   npm install -g localtunnel');
    console.log('   lt --port 3000');
    console.log('');
    console.log('Или cloudflared:');
    console.log('   npm install -g cloudflared');
    console.log('   cloudflared tunnel --url http://localhost:3000');

} catch (error) {
    console.error('❌ Ошибка генерации:', error.message);
    console.log('');
    console.log('🔧 Альтернативный способ с PowerShell:');
    console.log('');
    console.log('$cert = New-SelfSignedCertificate -DnsName "localhost" -CertStoreLocation "cert:\\LocalMachine\\My"');
    console.log('$pwd = ConvertTo-SecureString -String "password" -Force -AsPlainText');
    console.log('Export-PfxCertificate -Cert $cert -FilePath "ssl/cert.pfx" -Password $pwd');
}
