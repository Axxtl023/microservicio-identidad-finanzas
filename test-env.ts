import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

const envPath = path.resolve(process.cwd(), '.env');

console.log('\n=== DIAGNÓSTICO DE ENTORNO ===\n');

// 1. Directorio de trabajo actual
console.log('CWD (donde Prisma buscará .env):', process.cwd());
console.log('Ruta .env esperada:', envPath);
console.log('.env existe:', fs.existsSync(envPath));

if (fs.existsSync(envPath)) {
  // 2. Metadatos del archivo
  const stat = fs.statSync(envPath);
  const raw = fs.readFileSync(envPath);
  const bom = raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf;
  const hasCrlf = raw.includes(0x0d);

  console.log('\n--- Metadatos del archivo ---');
  console.log('Tamaño (bytes):', stat.size);
  console.log('BOM UTF-8 detectado:', bom ? 'SÍ ⚠️  (problema potencial)' : 'NO ✅');
  console.log('Saltos CRLF (Windows):', hasCrlf ? 'SÍ ⚠️  (puede romper parsers)' : 'NO ✅ (LF puro)');
  console.log('Primeros 3 bytes (hex):', raw.slice(0, 3).toString('hex'));

  // 3. Cargar y verificar variables
  console.log('\n--- Carga con dotenv ---');
  const result = dotenv.config({ path: envPath });
  if (result.error) {
    console.log('Error dotenv:', result.error.message);
  } else {
    console.log('DATABASE_URL:', process.env.DATABASE_URL
      ? `✅ ENCONTRADA (${process.env.DATABASE_URL.substring(0, 35)}...)`
      : '❌ NO ENCONTRADA');
    console.log('JWT_SECRET:  ', process.env.JWT_SECRET ? '✅ ENCONTRADA' : '❌ NO ENCONTRADA');
    console.log('PORT:        ', process.env.PORT ?? '❌ NO ENCONTRADA');
  }
} else {
  console.log('\n❌ ARCHIVO .env NO ENCONTRADO EN:', envPath);
  console.log('\nArchivos en este directorio:');
  fs.readdirSync(process.cwd()).forEach(f => console.log(' -', f));
}

console.log('\n=== FIN DEL DIAGNÓSTICO ===\n');
